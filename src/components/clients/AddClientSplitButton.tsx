import { useEffect, useState } from 'react'
import { Check, ChevronDown, Link2, Plus, UserPlus } from 'lucide-react'
import { getActiveTenantId } from '@/lib/authApi'
import { agencyClientFormUrl, subAgentClientFormUrl } from '@/lib/publicUrl'
import { Button } from '@/components/shadcn/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/shadcn/dropdown-menu'

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value)
  } catch {
    const field = document.createElement('textarea')
    field.value = value
    field.setAttribute('readonly', '')
    field.style.position = 'fixed'
    field.style.opacity = '0'
    document.body.appendChild(field)
    field.select()
    document.execCommand('copy')
    field.remove()
  }
}

type AddClientSplitButtonProps = {
  onAddClient: () => void
  subAgentId?: string
  size?: 'sm' | 'md'
  label?: string
}

export function AddClientSplitButton({
  onAddClient,
  subAgentId,
  label = 'Add Client',
}: AddClientSplitButtonProps) {
  const [copied, setCopied] = useState(false)
  const Icon = label === 'New client' || label === 'New Client' ? Plus : UserPlus

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 1500)
    return () => window.clearTimeout(timer)
  }, [copied])

  const copyFormLink = async () => {
    const url = subAgentId
      ? subAgentClientFormUrl(subAgentId)
      : agencyClientFormUrl(getActiveTenantId())
    await copyText(url)
    setCopied(true)
  }

  return (
    <div className="inline-flex rounded-lg shadow-xs">
      <Button
        type="button"
        size="lg"
        className="rounded-l-lg rounded-r-none border-r-0 shadow-none"
        onClick={onAddClient}
      >
        <Icon data-icon="inline-start" />
        {label}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size="lg"
            className="-ml-px w-9 rounded-l-none rounded-r-lg border-l border-l-white/25 px-0 shadow-none"
            aria-label="Copy Form Link"
          >
            <ChevronDown />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-auto min-w-40">
          <DropdownMenuItem className="whitespace-nowrap" onSelect={() => void copyFormLink()}>
            {copied ? <Check /> : <Link2 />}
            {copied ? 'Copied' : 'Copy Form Link'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
