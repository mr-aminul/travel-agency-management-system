import { Check, ChevronRight, Paperclip } from 'lucide-react'
import { Checkbox } from '@/components/shadcn/checkbox'
import { cn } from '@/lib/utils'
import {
  countTaskProgress,
  type DemoSubtask,
  type DemoTask,
} from '@/pages/clients-v2/demoSeed'

export type ServiceTaskListProps = {
  serviceName: string
  country: string
  tasks: DemoTask[]
  onToggleTask: (taskId: string, done: boolean) => void
  onToggleSubtask: (taskId: string, subtaskId: string, done: boolean) => void
}

function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>
          {done}/{total} tasks
        </span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-200"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function SubtaskRow({
  subtask,
  onToggle,
}: {
  subtask: DemoSubtask
  onToggle: (done: boolean) => void
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 border-l-2 border-border/70 py-2 pl-3 pr-2',
        subtask.done && 'opacity-70',
      )}
    >
      <Checkbox
        checked={subtask.done}
        onCheckedChange={(value) => onToggle(value === true)}
        className="mt-0.5"
        aria-label={subtask.title}
      />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'text-sm text-foreground',
            subtask.done && 'line-through text-muted-foreground',
          )}
        >
          {subtask.title}
        </p>
        {(subtask.placeholder || subtask.fillValue) && (
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Paperclip className="size-3 shrink-0" aria-hidden />
            {subtask.done && subtask.fillValue
              ? subtask.fillValue
              : (subtask.placeholder ?? 'Attachment')}
          </p>
        )}
      </div>
    </div>
  )
}

function TaskRow({
  task,
  onToggleTask,
  onToggleSubtask,
}: {
  task: DemoTask
  onToggleTask: (done: boolean) => void
  onToggleSubtask: (subtaskId: string, done: boolean) => void
}) {
  const openSubs = task.subtasks.filter((s) => !s.done).length
  return (
    <li className="border-b border-border last:border-b-0">
      <div className="flex items-start gap-3 px-4 py-3">
        <Checkbox
          checked={task.done}
          onCheckedChange={(value) => onToggleTask(value === true)}
          className="mt-0.5"
          aria-label={task.title}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p
              className={cn(
                'text-sm font-medium text-foreground',
                task.done && 'line-through text-muted-foreground',
              )}
            >
              {task.title}
            </p>
            {task.done ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                <Check className="size-3" aria-hidden />
                Done
              </span>
            ) : task.subtasks.length > 0 ? (
              <span className="text-[11px] text-muted-foreground">
                {openSubs} open
              </span>
            ) : null}
          </div>
          {task.subtasks.length > 0 ? (
            <div className="mt-2 flex flex-col gap-0.5 pl-1">
              {task.subtasks.map((sub) => (
                <SubtaskRow
                  key={sub.id}
                  subtask={sub}
                  onToggle={(done) => onToggleSubtask(sub.id, done)}
                />
              ))}
            </div>
          ) : null}
        </div>
        <ChevronRight
          className="mt-0.5 size-4 shrink-0 text-muted-foreground/50"
          aria-hidden
        />
      </div>
    </li>
  )
}

export function ServiceTaskList({
  serviceName,
  country,
  tasks,
  onToggleTask,
  onToggleSubtask,
}: ServiceTaskListProps) {
  const progress = countTaskProgress(tasks)

  return (
    <section
      className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
      aria-label={`${serviceName} task list`}
    >
      <header className="flex flex-wrap items-center gap-4 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-foreground">
            {serviceName}
          </h2>
          <p className="text-xs text-muted-foreground">{country}</p>
        </div>
        <ProgressBar done={progress.done} total={progress.total} />
      </header>
      <ul className="divide-y-0">
        {tasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            onToggleTask={(done) => onToggleTask(task.id, done)}
            onToggleSubtask={(subtaskId, done) =>
              onToggleSubtask(task.id, subtaskId, done)
            }
          />
        ))}
      </ul>
    </section>
  )
}
