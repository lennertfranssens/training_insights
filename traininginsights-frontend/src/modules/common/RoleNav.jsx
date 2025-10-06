import React from 'react'

// Return an ordered list of nav items based on roles
// Each item: { label, to }
export function getNavItems(roles = []){
  const rset = new Set(roles || [])
  const items = []

  // Super Admin
  if (rset.has('ROLE_SUPERADMIN')){
    items.push(
      { label: 'Clubs', to: '/dashboard/clubs' },
      { label: 'Admins', to: '/dashboard/admins' },
      { label: 'Users', to: '/dashboard/users' },
      { label: 'Backup', to: '/dashboard/backup' },
      { label: 'Base URL', to: '/dashboard/super/base-url' },
    )
  }

  // Admin
  if (rset.has('ROLE_ADMIN')){
    items.push(
      { label: 'Groups', to: '/dashboard/groups' },
      { label: 'Trainers', to: '/dashboard/trainers' },
      { label: 'Athletes', to: '/dashboard/athletes' },
      { label: 'Users', to: '/dashboard/users' },
      { label: 'Club Members', to: '/dashboard/club-members' },
      { label: 'Push Config', to: '/dashboard/push-config' },
      { label: 'SMTP Settings', to: '/dashboard/smtp' },
      { label: 'Seasons', to: '/dashboard/seasons' },
      { label: 'Notifications', to: '/dashboard/notifications' },
      { label: 'Create Notification', to: '/dashboard/create-notification' },
    )
  }

  // Trainer
  if (rset.has('ROLE_TRAINER')){
    items.push(
      { label: 'Groups', to: '/dashboard/groups' },
      { label: 'Athletes', to: '/dashboard/athletes' },
      { label: 'Trainings', to: '/dashboard/trainings' },
      { label: 'Questionnaires', to: '/dashboard/questionnaires' },
      { label: 'Goals', to: '/dashboard/trainer/goals' },
      { label: 'Analytics', to: '/dashboard/analytics' },
      { label: 'Notifications', to: '/dashboard/notifications' },
      { label: 'Create Notification', to: '/dashboard/create-notification' },
    )
  }

  // Athlete
  if (rset.has('ROLE_ATHLETE')){
    items.push(
      { label: 'Trainings', to: '/dashboard/athlete/trainings' },
      { label: 'Questionnaires', to: '/dashboard/athlete/questionnaires' },
      { label: 'Goals', to: '/dashboard/athlete/goals' },
      { label: 'Notifications', to: '/dashboard/notifications' },
    )
  }

  // De-duplicate by path while preserving first label occurrence
  const seen = new Set()
  return items.filter(it => {
    const key = it.to || `section:${it.section}`
    if (seen.has(key)) return false
    seen.add(key); return true
  })
}

export default function RoleNav(){
  return null // utility only
}
