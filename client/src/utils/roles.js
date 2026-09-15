export const ROLES = {
  ADMIN: 'ADMIN',
  STUDENT: 'STUDENT',
  ALUMNI: 'ALUMNI',
  RECRUITER: 'RECRUITER',
  FACULTY: 'FACULTY',
}

export const ROLE_LABELS = {
  ADMIN: 'Admin',
  STUDENT: 'Student',
  ALUMNI: 'Alumni',
  RECRUITER: 'Recruiter',
  FACULTY: 'Faculty',
}

// Roles selectable at self-registration. Admin is granted by the institution only.
export const REGISTERABLE_ROLES = [ROLES.STUDENT, ROLES.ALUMNI, ROLES.RECRUITER, ROLES.FACULTY]

export const ROLE_HOMES = {
  ADMIN: '/admin/dashboard',
  STUDENT: '/student/dashboard',
  ALUMNI: '/alumni/dashboard',
  RECRUITER: '/recruiter/dashboard',
  FACULTY: '/faculty/dashboard',
}

export function roleHome(role) {
  return ROLE_HOMES[role] ?? '/'
}