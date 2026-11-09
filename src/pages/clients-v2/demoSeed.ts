/** Frontend-only demo data for Clients v2 task-list prototype. */

export type DemoSyncField = 'passport' | 'passportExpiry'

export type DemoSubtask = {
  id: string
  title: string
  done: boolean
  /** When completed, write this value onto the demo client profile. */
  syncField?: DemoSyncField
  /** Value applied to the profile when this subtask is marked done. */
  fillValue?: string
  /** Placeholder shown before fill (document-style rows). */
  placeholder?: string
}

export type DemoTask = {
  id: string
  title: string
  done: boolean
  subtasks: DemoSubtask[]
}

export type DemoService = {
  id: string
  name: string
  country: string
  tasks: DemoTask[]
}

export type DemoClient = {
  id: string
  name: string
  mobile: string
  passport: string
  passportExpiry: string
  services: DemoService[]
}

function studentVisaTasks(): DemoTask[] {
  return [
    {
      id: 'complete-profile',
      title: 'Complete profile',
      done: false,
      subtasks: [
        {
          id: 'profile-name',
          title: 'Confirm full name and mobile',
          done: false,
        },
        {
          id: 'profile-address',
          title: 'Add current address',
          done: false,
        },
      ],
    },
    {
      id: 'upload-passport',
      title: 'Upload passport',
      done: false,
      subtasks: [
        {
          id: 'passport-scan',
          title: 'Passport scan on file',
          done: false,
          syncField: 'passport',
          fillValue: 'BP0123456',
          placeholder: 'Number fills on complete',
        },
        {
          id: 'passport-expiry',
          title: 'Passport expiry recorded',
          done: false,
          syncField: 'passportExpiry',
          fillValue: '2031-08-14',
          placeholder: 'Expiry fills on complete',
        },
      ],
    },
    {
      id: 'apply-university',
      title: 'Apply to university',
      done: false,
      subtasks: [
        {
          id: 'uni-choice',
          title: 'Preferred university noted',
          done: false,
        },
        {
          id: 'application-id',
          title: 'Application ID recorded',
          done: false,
        },
      ],
    },
    {
      id: 'upload-offer',
      title: 'Upload offer letter',
      done: false,
      subtasks: [
        {
          id: 'offer-letter',
          title: 'University offer letter',
          done: false,
          placeholder: 'PDF / image',
        },
      ],
    },
    {
      id: 'visa-filed',
      title: 'Visa filed',
      done: false,
      subtasks: [
        {
          id: 'visa-pack',
          title: 'Visa application pack',
          done: false,
        },
        {
          id: 'financial-proof',
          title: 'Financial proof',
          done: false,
        },
      ],
    },
    {
      id: 'ticket-booked',
      title: 'Ticket booked',
      done: false,
      subtasks: [
        {
          id: 'ticket',
          title: 'Flight ticket',
          done: false,
        },
      ],
    },
  ]
}

export function createDemoClients(): DemoClient[] {
  return [
    {
      id: 'demo-c-1',
      name: 'Ayesha Rahman',
      mobile: '01711-234567',
      passport: '',
      passportExpiry: '',
      services: [
        {
          id: 'svc-student-ca',
          name: 'Student Visa',
          country: 'Canada',
          tasks: studentVisaTasks(),
        },
      ],
    },
    {
      id: 'demo-c-2',
      name: 'Karim Hossain',
      mobile: '01812-998877',
      passport: 'EJ9988776',
      passportExpiry: '2029-03-01',
      services: [
        {
          id: 'svc-student-uk',
          name: 'Student Visa',
          country: 'United Kingdom',
          tasks: studentVisaTasks().map((task) => {
            if (task.id !== 'upload-passport') return task
            return {
              ...task,
              done: true,
              subtasks: task.subtasks.map((sub) => ({ ...sub, done: true })),
            }
          }),
        },
        {
          id: 'svc-tourist-tr',
          name: 'Tourist Visa',
          country: 'Turkey',
          tasks: [
            {
              id: 'tv-intake',
              title: 'Complete intake',
              done: true,
              subtasks: [],
            },
            {
              id: 'tv-passport',
              title: 'Upload passport',
              done: true,
              subtasks: [
                {
                  id: 'tv-passport-scan',
                  title: 'Passport scan on file',
                  done: true,
                  syncField: 'passport',
                  fillValue: 'EJ9988776',
                },
              ],
            },
            {
              id: 'tv-apply',
              title: 'Submit visa application',
              done: false,
              subtasks: [
                {
                  id: 'tv-form',
                  title: 'Application form',
                  done: false,
                },
              ],
            },
            {
              id: 'tv-decision',
              title: 'Visa decision',
              done: false,
              subtasks: [],
            },
          ],
        },
      ],
    },
    {
      id: 'demo-c-3',
      name: 'Nadia Islam',
      mobile: '01955-443322',
      passport: '',
      passportExpiry: '',
      services: [
        {
          id: 'svc-student-au',
          name: 'Student Visa',
          country: 'Australia',
          tasks: studentVisaTasks(),
        },
      ],
    },
  ]
}

export function countTaskProgress(tasks: DemoTask[]): {
  done: number
  total: number
} {
  const total = tasks.length
  const done = tasks.filter((task) => task.done).length
  return { done, total }
}

/** Parent is done only when every subtask is done (or no subtasks and toggled). */
export function withParentDoneFromSubtasks(task: DemoTask): DemoTask {
  if (task.subtasks.length === 0) return task
  return {
    ...task,
    done: task.subtasks.every((sub) => sub.done),
  }
}
