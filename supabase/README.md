# One-time Supabase setup

Run `migrations/202610100001_admin_and_registration_features.sql` in the Supabase SQL Editor for the NU Wizards project.

Then run `migrations/202610100002_protect_student_data.sql` to limit public access to student information.

To allow admins to remove user accounts from the admin workspace, also run `migrations/202610100003_admin_delete_user.sql` in the SQL Editor. This deletes the selected Supabase login account and its profile. Existing tournament registrations are retained, and the final active admin account cannot be removed.

Then make the first staff account an administrator. Replace the email below with the email used to sign in to the site:

```sql
update public.profiles
set role = 'admin'
where email = 'your-staff-email@example.com';
```

The migration adds the required registration fields, private COR document storage, role-based access, editable tournament data, and persisted tournament matches. It also locks write access to administrator accounts and the signed-in student who owns a registration.
