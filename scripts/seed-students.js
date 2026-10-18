const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function seedStudents() {
  // Get ECE department
  const { data: dept } = await admin.from('departments').select('id').eq('code', 'ECE').single();
  const departmentId = dept?.id || null;
  console.log('ECE Department ID:', departmentId);

  // Generate roll numbers
  const rollNumbers = [];

  // 25MVECER0001 to 25MVECER0090
  for (let i = 1; i <= 90; i++) {
    const num = String(i).padStart(4, '0');
    rollNumbers.push(`25MVECER${num}`);
  }

  // 26MVECEL0001 to 26MVECEL0009
  for (let i = 1; i <= 9; i++) {
    const num = String(i).padStart(4, '0');
    rollNumbers.push(`26MVECEL${num}`);
  }

  console.log(`Starting to seed ${rollNumbers.length} student accounts...`);

  // Fetch existing users to avoid duplicate calls
  const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const existingMap = new Map();
  users.forEach((u) => existingMap.set(u.email?.toLowerCase(), u));

  let createdCount = 0;
  let updatedCount = 0;
  let errorCount = 0;

  for (const roll of rollNumbers) {
    const email = `${roll.toLowerCase()}@ece.college`;
    const password = roll; // Password is the roll number itself
    const existing = existingMap.get(email);

    try {
      if (existing) {
        // Update password if user already exists
        const { error: updateErr } = await admin.auth.admin.updateUserById(existing.id, {
          password,
          user_metadata: { full_name: roll, roll_number: roll },
        });
        if (updateErr) {
          console.error(`Failed to update ${roll}:`, updateErr.message);
          errorCount++;
        } else {
          updatedCount++;
        }
      } else {
        const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: roll, roll_number: roll },
        });

        if (createErr) {
          console.error(`Failed to create ${roll}:`, createErr.message);
          errorCount++;
        } else {
          createdCount++;
          // Ensure profile has department_id
          if (departmentId && newUser?.user) {
            await admin
              .from('user_profiles')
              .update({ department_id: departmentId })
              .eq('id', newUser.user.id);
          }
        }
      }
    } catch (err) {
      console.error(`Error processing ${roll}:`, err.message);
      errorCount++;
    }
  }

  console.log(`\n--- Seeding Complete ---`);
  console.log(`Created: ${createdCount}`);
  console.log(`Updated: ${updatedCount}`);
  console.log(`Errors:  ${errorCount}`);
  console.log(`Total:   ${rollNumbers.length}`);
}

seedStudents();
