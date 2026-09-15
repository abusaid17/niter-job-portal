export function calculateSkillMatch(studentSkills, jobSkills) {
  if (!jobSkills || jobSkills.length === 0) return 100
  if (!studentSkills || studentSkills.length === 0) return 0

  const studentSkillSet = new Set(
    studentSkills.map((s) => s.toLowerCase().trim())
  )
  const jobSkillSet = new Set(jobSkills.map((s) => s.toLowerCase().trim()))

  let matched = 0
  for (const skill of jobSkillSet) {
    if (studentSkillSet.has(skill)) {
      matched++
    }
  }

  const percentage = Math.round((matched / jobSkillSet.size) * 100)
  return percentage
}

export function getMatchBadgeClass(percentage) {
  if (percentage >= 80) return 'badge-success'
  if (percentage >= 60) return 'badge-warning'
  if (percentage >= 40) return 'badge-info'
  return 'badge-error'
}