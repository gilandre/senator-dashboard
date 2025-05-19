import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding test data for recent activities...')

  // Generate 20 random access logs
  const currentDate = new Date()
  
  // Create some employees first
  const employees = [
    { 
      badge_number: 'EMP001', 
      first_name: 'Jean', 
      last_name: 'Dupont', 
      email: 'jean.dupont@example.com',
      department: 'Marketing',
      position: 'Marketing Manager',
      employee_id: 'EM10001'
    },
    { 
      badge_number: 'EMP002', 
      first_name: 'Marie', 
      last_name: 'Martin', 
      email: 'marie.martin@example.com',
      department: 'IT',
      position: 'Software Developer',
      employee_id: 'EM10002'
    },
    { 
      badge_number: 'EMP003', 
      first_name: 'Pierre', 
      last_name: 'Bernard', 
      email: 'pierre.bernard@example.com',
      department: 'Sales',
      position: 'Sales Representative',
      employee_id: 'EM10003'
    },
    { 
      badge_number: 'EMP004', 
      first_name: 'Sophie', 
      last_name: 'Dubois', 
      email: 'sophie.dubois@example.com',
      department: 'HR',
      position: 'HR Manager',
      employee_id: 'EM10004'
    },
    { 
      badge_number: 'EMP005', 
      first_name: 'Thomas', 
      last_name: 'Rousseau', 
      email: 'thomas.rousseau@example.com',
      department: 'Finance',
      position: 'Financial Analyst',
      employee_id: 'EM10005'
    },
  ]

  // Create some visitors
  const visitors = [
    { 
      badge_number: 'VIS001', 
      first_name: 'Paul', 
      last_name: 'Miller', 
      company: 'Acme Corp', 
      reason: 'Business Meeting'
    },
    { 
      badge_number: 'VIS002', 
      first_name: 'Carla', 
      last_name: 'Johnson', 
      company: 'Tech Solutions', 
      reason: 'Client Visit'
    },
    { 
      badge_number: 'VIS003', 
      first_name: 'David', 
      last_name: 'Brown', 
      company: 'Partner LLC', 
      reason: 'Project Meeting'
    },
  ]

  // First check if employees already exist, create them if not
  console.log('Creating employees...')
  for (const emp of employees) {
    const existingEmployee = await prisma.employees.findUnique({
      where: { badge_number: emp.badge_number }
    })
    
    if (!existingEmployee) {
      try {
        await prisma.employees.create({
          data: emp
        })
        console.log(`Created employee: ${emp.first_name} ${emp.last_name}`)
      } catch (error) {
        console.error(`Error creating employee ${emp.badge_number}:`, error)
      }
    } else {
      console.log(`Employee ${emp.badge_number} already exists, skipping...`)
    }
  }

  console.log('Creating visitors...')
  for (const visitor of visitors) {
    const existingVisitor = await prisma.visitors.findUnique({
      where: { badge_number: visitor.badge_number }
    })
    
    if (!existingVisitor) {
      try {
        await prisma.visitors.create({
          data: visitor
        })
        console.log(`Created visitor: ${visitor.first_name} ${visitor.last_name}`)
      } catch (error) {
        console.error(`Error creating visitor ${visitor.badge_number}:`, error)
      }
    } else {
      console.log(`Visitor ${visitor.badge_number} already exists, skipping...`)
    }
  }

  // List of readers
  const readers = [
    'Entrée principale',
    'Parking souterrain',
    'Entrée des employés',
    'Laboratoire R&D',
    'Bureau direction',
    'Cafétéria',
    'Salle de conférence'
  ]

  // List of terminals
  const terminals = [
    'Terminal-A1',
    'Terminal-B2',
    'Terminal-C3',
    'Terminal-D4',
    'Terminal-E5'
  ]

  // Create access logs
  const accessLogs = []
  const eventTypes = ['entry', 'exit', 'unknown']
  const directions = ['in', 'out']
  const groups = ['Groupe A', 'Groupe B', 'Groupe C', 'Groupe D']

  // First clear any existing test access logs
  console.log('Clearing existing test access logs...')
  const testBadges = [...employees.map(e => e.badge_number), ...visitors.map(v => v.badge_number)]
  
  try {
    await prisma.access_logs.deleteMany({
      where: {
        badge_number: {
          in: testBadges
        }
      }
    })
    console.log('Existing test access logs cleared')
  } catch (error) {
    console.error('Error clearing test access logs:', error)
  }

  console.log('Creating access logs...')
  
  // Create access logs for employees
  for (let i = 0; i < employees.length; i++) {
    const emp = employees[i]
    
    // Entry in the morning - make it today
    const entryDate = new Date()
    entryDate.setHours(8 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60), 0)
    
    try {
      await prisma.access_logs.create({
        data: {
          badge_number: emp.badge_number,
          person_type: 'employee',
          event_date: new Date(entryDate.toISOString().split('T')[0]),
          event_time: entryDate,
          reader: readers[Math.floor(Math.random() * readers.length)],
          terminal: terminals[Math.floor(Math.random() * terminals.length)],
          event_type: 'entry',
          direction: 'in',
          full_name: `${emp.first_name} ${emp.last_name}`,
          group_name: groups[Math.floor(Math.random() * groups.length)],
          processed: true,
          created_at: entryDate
        }
      })
      console.log(`Created entry log for employee ${emp.badge_number}`)
    } catch (error) {
      console.error(`Error creating entry log for employee ${emp.badge_number}:`, error)
    }
    
    // Don't create exit logs for some - they're still in the building
    if (i % 2 === 0) {
      // Exit in the evening
      const exitDate = new Date(entryDate)
      exitDate.setHours(17 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60), 0)
      
      try {
        await prisma.access_logs.create({
          data: {
            badge_number: emp.badge_number,
            person_type: 'employee',
            event_date: new Date(exitDate.toISOString().split('T')[0]),
            event_time: exitDate,
            reader: readers[Math.floor(Math.random() * readers.length)],
            terminal: terminals[Math.floor(Math.random() * terminals.length)],
            event_type: 'exit',
            direction: 'out',
            full_name: `${emp.first_name} ${emp.last_name}`,
            group_name: groups[Math.floor(Math.random() * groups.length)],
            processed: true,
            created_at: exitDate
          }
        })
        console.log(`Created exit log for employee ${emp.badge_number}`)
      } catch (error) {
        console.error(`Error creating exit log for employee ${emp.badge_number}:`, error)
      }
    }
  }
  
  // Create access logs for visitors
  for (let i = 0; i < visitors.length; i++) {
    const visitor = visitors[i]
    
    // Random time for visitor
    const visitDate = new Date(currentDate)
    visitDate.setHours(10 + Math.floor(Math.random() * 6), Math.floor(Math.random() * 60), 0)
    visitDate.setDate(visitDate.getDate() - Math.floor(Math.random() * 5)) // Within last 5 days
    
    // Entry
    try {
      await prisma.access_logs.create({
        data: {
          badge_number: visitor.badge_number,
          person_type: 'visitor',
          event_date: new Date(visitDate.toISOString().split('T')[0]),
          event_time: visitDate,
          reader: readers[Math.floor(Math.random() * readers.length)],
          terminal: terminals[Math.floor(Math.random() * terminals.length)],
          event_type: 'entry',
          direction: 'in',
          full_name: `${visitor.first_name} ${visitor.last_name}`,
          group_name: 'Visiteurs',
          processed: true,
          created_at: visitDate
        }
      })
      console.log(`Created entry log for visitor ${visitor.badge_number}`)
    } catch (error) {
      console.error(`Error creating entry log for visitor ${visitor.badge_number}:`, error)
    }
    
    // Exit (some hours later)
    const exitTime = new Date(visitDate)
    exitTime.setHours(exitTime.getHours() + 1 + Math.floor(Math.random() * 3))
    
    try {
      await prisma.access_logs.create({
        data: {
          badge_number: visitor.badge_number,
          person_type: 'visitor',
          event_date: new Date(exitTime.toISOString().split('T')[0]),
          event_time: exitTime,
          reader: readers[Math.floor(Math.random() * readers.length)],
          terminal: terminals[Math.floor(Math.random() * terminals.length)],
          event_type: 'exit',
          direction: 'out',
          full_name: `${visitor.first_name} ${visitor.last_name}`,
          group_name: 'Visiteurs',
          processed: true,
          created_at: exitTime
        }
      })
      console.log(`Created exit log for visitor ${visitor.badge_number}`)
    } catch (error) {
      console.error(`Error creating exit log for visitor ${visitor.badge_number}:`, error)
    }
  }
  
  // Create a few rejected accesses
  for (let i = 0; i < 3; i++) {
    const personType = Math.random() > 0.5 ? 'employee' : 'visitor'
    const person = personType === 'employee' 
      ? employees[Math.floor(Math.random() * employees.length)]
      : visitors[Math.floor(Math.random() * visitors.length)]
    
    const rejectDate = new Date(currentDate)
    rejectDate.setHours(9 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 60), 0)
    rejectDate.setDate(rejectDate.getDate() - Math.floor(Math.random() * 3)) // Within last 3 days
    
    try {
      await prisma.access_logs.create({
        data: {
          badge_number: person.badge_number,
          person_type: personType,
          event_date: new Date(rejectDate.toISOString().split('T')[0]),
          event_time: rejectDate,
          reader: readers[Math.floor(Math.random() * readers.length)],
          terminal: terminals[Math.floor(Math.random() * terminals.length)],
          event_type: 'unknown', // This will be treated as a rejected access
          direction: Math.random() > 0.5 ? 'in' : 'out',
          full_name: `${person.first_name} ${person.last_name}`,
          group_name: personType === 'employee' ? groups[Math.floor(Math.random() * groups.length)] : 'Visiteurs',
          processed: true,
          created_at: rejectDate
        }
      })
      console.log(`Created rejected access log for ${personType} ${person.badge_number}`)
    } catch (error) {
      console.error(`Error creating rejected access log for ${personType} ${person.badge_number}:`, error)
    }
  }

  console.log('Seeding complete!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  }) 