import { useEffect, useState } from 'react'
import { Check, ChevronDown, Link2, Plus, UserPlus } from 'lucide-react'
import { getActiveTenantId } from '@/lib/authApi'
import { agencyClientFormUrl, subAgentClientFormUrl } from '@/lib/publicUrl'
import { Button, DropdownMenu } from '@/components/ui'

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
  /** When set, the copied form onboards clients under this sub agent. */
  subAgentId?: string
  size?: 'sm' | 'md'
  label?: string
}

export function AddClientSplitButton({
  onAddClient,
  subAgentId,
  size = 'sm',
  label = 'Add Client',
}: AddClientSplitButtonProps) {
  const [copied, setCopied] = useState(false)
  const Icon = label === 'New client' ? Plus : UserPlus
  const iconSize = size === 'sm' ? 14 : 16

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
    <div className={`pd-split-btn pd-split-btn--${size}`}>
      <Button size={size} className="pd-split-btn__main" onClick={onAddClient}>
        <Icon size={iconSize} strokeWidth={2.25} aria-hidden />
        {label}
      </Button>
      <DropdownMenu
        label="More client actions"
        align="end"
        items={[
          {
            id: 'copy-form',
            label: copied ? 'Copied' : 'Copy Form Link',
            icon: copied ? (
              <Check size={14} strokeWidth={2.25} />
            ) : (
              <Link2 size={14} strokeWidth={2.25} />
            ),
            onSelect: () => {
              void copyFormLink()
            },
          },
        ]}
        trigger={
          <ChevronDown
            size={iconSize}
            strokeWidth={2.25}
            aria-hidden
          />
        }
        triggerProps={{
          'aria-label': 'Copy Form Link',
          title: 'Copy Form Link',
        }}
      />
    </div>
  )
}
