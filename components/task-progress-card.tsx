'use client'

import { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  CheckCircle,
  Circle,
  User,
  KeyRound,
  Wrench,
  Star,
  X,
  RotateCcw,
} from 'lucide-react'
import { cn, formatCurrency, formatDateTime } from '@/lib/utils'
import { Task, PaymentRefund, PaymentTransaction } from '@/types'

interface TaskProgressCardProps {
  task: Task
  refund?: PaymentRefund | null
  transaction?: PaymentTransaction | null
  onAssignHelper?: () => void
  onRefundCustomer?: () => void
  isRefunding?: boolean
  canRefund?: boolean
}

type CancellationCalculation = {
  workType: string
  policy: string
  policyDetail: string
  paidAmount: number
  cancellationFee: number
  policyFee: number
  refundAmount: number
  postedAt: string
  paymentAt: string
  workStartAt: string
  evaluatedAt: string
  timeStatus: string
  formula: string
  isEstimate: boolean
}

function money(value: number): string {
  const exactValue = Math.max(0, Math.round(value * 100) / 100)
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(exactValue)
}

function parseScheduledStart(task: Task): Date | null {
  if (!task.scheduledDate) return null
  const start = new Date(task.scheduledDate)
  if (Number.isNaN(start.getTime())) return null
  const match = String(task.scheduledTimeStart || '').trim().match(/^(\d{1,2}):(\d{2})(?:\s*([AP]M))?$/i)
  if (match) {
    let hours = Number(match[1])
    const minutes = Number(match[2])
    const meridiem = match[3]?.toUpperCase()
    if (meridiem === 'PM' && hours < 12) hours += 12
    if (meridiem === 'AM' && hours === 12) hours = 0
    start.setHours(hours, minutes, 0, 0)
  }
  return start
}

function getWorkType(task: Task): 'book_now' | 'hourly' | 'post_work' {
  const source = String(task.bookingSource || '').toLowerCase().replace(/[-\s]/g, '_')
  const taskDetails = task as Task & { categorySlug?: string; categoryLabel?: string }
  const hourlySignals = [
    taskDetails.categorySlug,
    taskDetails.categoryLabel,
    task.category,
    task.title,
    task.description,
  ].map((value) => String(value || '').toLowerCase())
  const isHourly = hourlySignals.some((value) =>
    value.includes('hourly-helper') || value.includes('hourly helper') ||
    value.includes('helper ·') || value.includes('helper -') ||
    value.includes('on-demand help'),
  )
  if (isHourly || source.includes('hourly')) return 'hourly'
  if (source === 'book_now') return 'book_now'
  return 'post_work'
}

function getCancellationCalculation(
  task: Task,
  refund: PaymentRefund | null | undefined,
  transaction: PaymentTransaction | null | undefined,
  now: Date,
): CancellationCalculation {
  const workType = getWorkType(task)
  const workTypeLabel = workType === 'book_now' ? 'Book Now' : workType === 'hourly' ? 'Hourly Helper' : 'Post & Choose'
  const paidAmount = Number(transaction?.amountInRupees) || Number(task.budget) * 1.18
  const evaluatedAt = task.cancelledAt ? new Date(task.cancelledAt) : now
  const postedAt = new Date(task.createdAt)
  const paymentAt = transaction?.createdAt ? new Date(transaction.createdAt) : postedAt
  const workStart = parseScheduledStart(task)
  const hoursUntilStart = workStart ? (workStart.getTime() - evaluatedAt.getTime()) / 3600000 : null
  const timeStatus = hoursUntilStart === null
    ? 'Scheduled start is unavailable'
    : hoursUntilStart >= 0
      ? `${hoursUntilStart < 1 ? `${Math.round(hoursUntilStart * 60)} minutes` : `${hoursUntilStart.toFixed(1)} hours`} remaining`
      : `${Math.abs(hoursUntilStart).toFixed(1)} hours past scheduled start`
  const isEstimate = !task.cancelledAt
  let cancellationFee = 0
  let policy = 'Free cancellation'
  let policyDetail = ''

  if (workType === 'book_now') {
    const category = String(task.category || '').toLowerCase()
    const fees = category.includes('ac')
      ? { within24: 99, within4: 149, reached: 249, label: 'AC Services' }
      : category.includes('appliance')
        ? { within24: 99, within4: 99, reached: 149, label: 'Appliance Repair' }
        : { within24: 99, within4: 199, reached: 299, label: 'Home Cleaning' }
    const partnerReached = Boolean(task.startedAt || task.inProgressAt)
    if (partnerReached) {
      cancellationFee = fees.reached
      policy = `Partner reached location (${fees.label})`
      policyDetail = `Fixed ${money(cancellationFee)} fee after partner arrival.`
    } else if (hoursUntilStart !== null && hoursUntilStart > 24) {
      policy = `More than 24 hours before service (${fees.label})`
      policyDetail = 'Free cancellation.'
    } else if (hoursUntilStart !== null && hoursUntilStart > 4) {
      cancellationFee = fees.within24
      policy = `Within 24 hours (${fees.label})`
      policyDetail = `Fixed ${money(cancellationFee)} cancellation fee.`
    } else {
      cancellationFee = fees.within4
      policy = `Within 4 hours (${fees.label})`
      policyDetail = `Fixed ${money(cancellationFee)} cancellation fee.`
    }
  } else if (workType === 'hourly') {
    const arrived = Boolean(task.startedAt || task.inProgressAt)
    if (arrived) {
      cancellationFee = Math.min(99, paidAmount)
      policy = 'After helper arrival'
      policyDetail = `First-hour rate (${money(99)}), capped at the amount paid.`
    } else if (hoursUntilStart !== null && hoursUntilStart > 2) {
      policy = 'More than 120 minutes before start'
      policyDetail = 'Free cancellation.'
    } else {
      cancellationFee = Math.min(49, paidAmount)
      policy = 'Within 120 minutes before start'
      policyDetail = `Flat ${money(cancellationFee)} late-cancellation fee.`
    }
  } else if (hoursUntilStart !== null && hoursUntilStart > 24) {
    policy = 'More than 24 hours before work'
    policyDetail = 'Free cancellation.'
  } else if (hoursUntilStart !== null && hoursUntilStart > 1) {
    cancellationFee = paidAmount * 0.1
    policy = 'Within 24 hours before work'
    policyDetail = '10% of the work amount.'
  } else {
    cancellationFee = paidAmount * 0.2
    policy = 'Within 1 hour before work'
    policyDetail = '20% of the work amount.'
  }

  const refundAmount = Math.max(0, paidAmount - cancellationFee)

  return {
    workType: workTypeLabel,
    policy,
    policyDetail,
    paidAmount,
    cancellationFee,
    policyFee: cancellationFee,
    refundAmount,
    postedAt: postedAt.toISOString(),
    paymentAt: paymentAt.toISOString(),
    workStartAt: workStart?.toISOString() || '',
    evaluatedAt: evaluatedAt.toISOString(),
    timeStatus,
    formula: `${money(paidAmount)} paid - ${money(cancellationFee)} policy fee = ${money(refundAmount)} calculated refund`,
    isEstimate,
  }
}

type StepState = 'done' | 'active' | 'future' | 'cancelled'

interface LifecycleStep {
  id: string
  label: string
  state: StepState
  timestamp?: string | null
  detail?: string
  badge?: { label: string; className: string }
}

function normalizeStatus(status: string | undefined): string {
  return String(status ?? 'open')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
}

function getCancellationStepIndex(task: Task): number {
  if (!task.cancelledAt) return 1

  const cancelTime = new Date(task.cancelledAt).getTime()

  if (task.assignedAt && cancelTime >= new Date(task.assignedAt).getTime()) {
    if (task.startedAt && cancelTime >= new Date(task.startedAt).getTime()) {
      if (task.inProgressAt && cancelTime >= new Date(task.inProgressAt).getTime()) {
        return 4
      }
      return 3
    }
    return 2
  }

  return 1
}

function getSlotHoursLabel(task: Task): string | null {
  if (!task.scheduledDate || task.bookingSource !== 'book_now') return null

  const scheduled = new Date(task.scheduledDate)
  if (task.scheduledTimeStart) {
    const [hours, minutes] = task.scheduledTimeStart.split(':').map(Number)
    if (!Number.isNaN(hours)) {
      scheduled.setHours(hours, Number.isNaN(minutes) ? 0 : minutes, 0, 0)
    }
  }

  const diffMs = scheduled.getTime() - Date.now()
  if (diffMs <= 0) return null

  const hours = Math.round(diffMs / (1000 * 60 * 60))
  if (hours < 1) return 'slot in under 1 hr'
  return `slot in ${hours} hrs`
}

function getPaymentState(task: Task): { captured: boolean; failed: boolean; initiated: boolean } {
  if (task.bookingSource === 'book_now') {
    return { captured: true, failed: false, initiated: true }
  }
  const ps = task.paymentStatus?.toLowerCase()
  const es = task.escrowStatus?.toLowerCase()
  const captured = ps === 'captured' || es === 'held' || es === 'released' || es === 'refunded' || ps === 'refunded'
  const failed = ps === 'failed' || es === 'cancelled'
  const initiated = !!(ps && ps !== 'failed') || !!(es)
  return { captured, failed, initiated }
}

function getPaymentBadge(task: Task, budget: number): { label: string; className: string } {
  const { captured, failed } = getPaymentState(task)
  const es = task.escrowStatus?.toLowerCase()
  if (captured) {
    const label = es === 'released' ? 'Released' : es === 'held' ? 'Escrow held' : 'Captured'
    return {
      label: `${formatCurrency(budget)} · ${label}`,
      className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    }
  }
  if (failed) {
    return {
      label: `${formatCurrency(budget)} · ${task.paymentStatus === 'failed' ? 'Failed' : 'Cancelled'}`,
      className: 'bg-red-50 text-red-700 border-red-200',
    }
  }
  return {
    label: `${formatCurrency(budget)} · Awaiting payment`,
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  }
}

function checkIsTaskRefunded(task: Task, refund?: PaymentRefund | null): boolean {
  if (refund) {
    const currentTaskId = String(task.taskId || (task as any)._id || (task as any).id || '')
    if (refund.taskId && String(refund.taskId) === currentTaskId) return true
    if (!refund.taskId) return true
    return false
  }
  const es = task.escrowStatus?.toLowerCase()
  const ps = task.paymentStatus?.toLowerCase()
  return es === 'refunded' || ps === 'refunded' || (task as any)?.isRefunded === true
}

function getLifecycleSteps(task: Task, refund?: PaymentRefund | null): LifecycleStep[] {
  const status = normalizeStatus(task.status)
  const slotLabel = getSlotHoursLabel(task)
  const { captured: paymentCaptured, failed: paymentFailed } = getPaymentState(task)

  const isRefunded = checkIsTaskRefunded(task, refund)
  const currentTaskId = String(task.taskId || (task as any)._id || (task as any).id || '')
  const hasMatchingRefundRecord = Boolean(refund && (!refund.taskId || String(refund.taskId) === currentTaskId))

  const refundStep: LifecycleStep = {
    id: 'refund',
    label: 'Payment refunded',
    state: 'done',
    timestamp: (hasMatchingRefundRecord && refund?.createdAt) || (task as any)?.refundedAt || task.updatedAt,
    badge: {
      label: `${formatCurrency(hasMatchingRefundRecord && refund?.refundAmount ? Number(refund.refundAmount) : task.budget)} · Refunded`,
      className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    detail: hasMatchingRefundRecord && refund?.status ? `Refund ${refund.status} via Razorpay` : 'Full customer refund processed via Razorpay',
  }

  if (status === 'cancelled') {
    const cancelIndex = getCancellationStepIndex(task)

    const steps: LifecycleStep[] = [
      {
        id: 'payment',
        label: 'Payment captured',
        state: paymentCaptured ? 'done' : cancelIndex > 0 ? 'cancelled' : 'future',
        timestamp: task.createdAt,
        badge: getPaymentBadge(task, task.budget),
      },
    ]

    if (isRefunded) {
      steps.push(refundStep)
    }

    steps.push(
      {
        id: 'helper',
        label: 'Helper assignment',
        state:
          cancelIndex > 1 ? 'done' : cancelIndex === 1 ? 'cancelled' : 'future',
        timestamp: task.assignedAt,
        detail:
          cancelIndex === 1 && task.cancellationReason
            ? task.cancellationReason
            : undefined,
      },
      {
        id: 'otp',
        label: 'OTP verified · work started',
        state:
          cancelIndex > 2 ? 'done' : cancelIndex === 2 ? 'cancelled' : 'future',
        timestamp: task.startedAt,
      },
      {
        id: 'in-progress',
        label: 'In progress',
        state:
          cancelIndex > 3 ? 'done' : cancelIndex === 3 ? 'cancelled' : 'future',
        timestamp: task.inProgressAt,
      },
      {
        id: 'proof',
        label: 'Proof submitted · approved · closed',
        state: cancelIndex === 4 ? 'cancelled' : 'future',
        timestamp: task.completedAt,
      },
    )

    return steps
  }

  const helperDone = Boolean(task.startedAt) || status === 'started' || status === 'in_progress' || status === 'review' || status === 'completed'
  const otpDone = Boolean(task.startedAt)
  const inProgressDone = Boolean(task.inProgressAt)
  const proofDone = status === 'completed'

  const helperActive = status === 'assigned' && !helperDone
  const otpActive = status === 'started' && !otpDone
  const inProgressActive = (status === 'in_progress' || status === 'review') && !inProgressDone
  const proofActive = status === 'review' && !proofDone

  const paymentDone = paymentCaptured
  const paymentActive = !paymentCaptured && !paymentFailed && status !== 'open'

  const helperDetail = helperActive
    ? task.assigneeName
      ? task.assigneeName
      : slotLabel
        ? `No helper assigned · ${slotLabel}`
        : 'No helper assigned'
    : task.assigneeName

  const steps: LifecycleStep[] = [
    {
      id: 'payment',
      label: paymentFailed && !isRefunded ? 'Payment failed' : 'Payment captured',
      state: paymentDone ? 'done' : paymentActive ? 'active' : 'future',
      timestamp: paymentDone ? task.createdAt : undefined,
      badge: getPaymentBadge(task, task.budget),
    },
  ]

  if (isRefunded) {
    steps.push(refundStep)
  }

  steps.push(
    {
      id: 'helper',
      label: 'Helper assignment',
      state: helperDone ? 'done' : helperActive ? 'active' : 'future',
      timestamp: task.assignedAt,
      detail: helperDetail ?? undefined,
      badge: helperActive && !task.assignedTo
        ? {
            label: 'Action needed',
            className: 'bg-red-50 text-red-700 border-red-200',
          }
        : undefined,
    },
    {
      id: 'otp',
      label: 'OTP verified · work started',
      state: otpDone ? 'done' : otpActive ? 'active' : 'future',
      timestamp: task.startedAt,
    },
    {
      id: 'in-progress',
      label: 'In progress',
      state: inProgressDone ? 'done' : inProgressActive ? 'active' : 'future',
      timestamp: task.inProgressAt,
    },
    {
      id: 'proof',
      label: 'Proof submitted · approved · closed',
      state: proofDone ? 'done' : proofActive ? 'active' : 'future',
      timestamp: task.completedAt,
    },
  )

  return steps
}

function StepIcon({ step }: { step: LifecycleStep; index?: number }) {
  if (step.state === 'done') {
    if (step.id === 'refund') {
      return (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
          <RotateCcw className="h-4 w-4" />
        </div>
      )
    }
    return (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
        <CheckCircle className="h-4 w-4" />
      </div>
    )
  }

  if (step.state === 'active') {
    const StepIconComponent =
      step.id === 'helper' ? User :
      step.id === 'otp' ? KeyRound :
      step.id === 'in-progress' ? Wrench :
      step.id === 'proof' ? CheckCircle : Circle

    return (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
        <StepIconComponent className="h-4 w-4" />
      </div>
    )
  }

  if (step.state === 'cancelled') {
    return (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-600 text-white">
        <X className="h-4 w-4" />
      </div>
    )
  }

  const StepIconComponent =
    step.id === 'refund' ? RotateCcw :
    step.id === 'helper' ? User :
    step.id === 'otp' ? KeyRound :
    step.id === 'in-progress' ? Wrench :
    step.id === 'proof' ? CheckCircle : Circle

  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-gray-200 bg-white text-gray-300">
      <StepIconComponent className="h-4 w-4" />
    </div>
  )
}

function getEscrowValueClass(escrowStatus: string): string {
  const normalized = escrowStatus.toLowerCase()
  if (normalized.includes('refund')) return 'text-purple-600 font-medium'
  if (normalized.includes('release')) return 'text-amber-600 font-medium'
  return 'text-emerald-600 font-medium'
}

function getPayoutValueClass(payoutStatus: string): string {
  const normalized = payoutStatus.toLowerCase()
  if (
    normalized.includes('pending') ||
    normalized.includes('completion')
  ) {
    return 'text-amber-600 font-medium'
  }
  return 'text-emerald-600 font-medium'
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
      {children}
    </p>
  )
}

export function TaskProgressCard({ task, refund, transaction, onAssignHelper, onRefundCustomer, isRefunding, canRefund }: TaskProgressCardProps) {
  const proofSectionRef = useRef<HTMLDivElement>(null)
  const [refundDialogOpen, setRefundDialogOpen] = useState(false)
  const [calculationDialogOpen, setCalculationDialogOpen] = useState(false)
  const [calculationNow, setCalculationNow] = useState(() => new Date())
  const steps = getLifecycleSteps(task, refund)
  const status = normalizeStatus(task.status)

  useEffect(() => {
    if (!calculationDialogOpen) return undefined
    const interval = window.setInterval(() => setCalculationNow(new Date()), 60000)
    return () => window.clearInterval(interval)
  }, [calculationDialogOpen])

  const isRefunded = checkIsTaskRefunded(task, refund)
  const currentTaskId = String(task.taskId || (task as any)._id || (task as any).id || '')
  const hasMatchingRefundRecord = Boolean(refund && (!refund.taskId || String(refund.taskId) === currentTaskId))

  const fullRefundAmount =
    (transaction?.amountInRupees ? Number(transaction.amountInRupees) : null) ||
    (hasMatchingRefundRecord && refund?.refundAmount ? Number(refund.refundAmount) : null) ||
    (task.budget ? Math.round(task.budget * 1.18 * 100) / 100 : 0)

  const { captured: paymentCaptured, failed: paymentFailed } = getPaymentState(task)
  const escrowStatus = isRefunded
    ? 'Refunded'
    : task.escrowStatus
      ? task.escrowStatus.charAt(0).toUpperCase() + task.escrowStatus.slice(1)
      : paymentFailed
        ? 'Failed'
        : 'Awaiting payment'
  const payoutStatus = isRefunded ? 'Cancelled (Refunded)' : (task.payoutStatus ?? 'Pending completion')
  const partnerConfirmed = task.bookingSource === 'book_now' && Boolean(task.confirmed)
  const cancellationCalculation = getCancellationCalculation(task, refund, transaction, calculationNow)
  const actualRefundAmount = refund?.refundAmount ? Number(refund.refundAmount) : null

  const scrollToProof = () => {
    proofSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Work progress</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <SectionLabel>Lifecycle</SectionLabel>

          <div className="space-y-0">
            {steps.map((step, index) => {
              const nextStep = steps[index + 1]
              const connectorDone =
                step.state === 'done' && nextStep?.state === 'done'

              return (
                <div key={step.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <StepIcon step={step} index={index} />
                    {index < steps.length - 1 && (
                      <div
                        className={cn(
                          'my-1 w-0.5 flex-1 min-h-[24px]',
                          connectorDone ? 'bg-emerald-500' : 'bg-gray-200',
                        )}
                      />
                    )}
                  </div>

                  <div className={cn('pb-6 flex-1', index === steps.length - 1 && 'pb-0')}>
                    <p
                      className={cn(
                        'text-sm font-semibold',
                        step.state === 'active' && 'text-blue-700',
                        step.state === 'cancelled' && 'text-red-700',
                        step.state === 'future' && 'text-gray-400',
                        step.state === 'done' && 'text-gray-900',
                      )}
                    >
                      {step.label}
                    </p>

                    {step.timestamp ? (
                      <p className="mt-0.5 text-xs text-gray-500">
                        {formatDateTime(step.timestamp)}
                      </p>
                    ) : step.state === 'future' ? (
                      <p className="mt-0.5 text-xs text-gray-400">—</p>
                    ) : null}

                    {step.detail && (
                      <p
                        className={cn(
                          'mt-1 text-xs',
                          step.state === 'active' && !task.assignedTo && status === 'open'
                            ? 'text-amber-600'
                            : 'text-gray-600',
                        )}
                      >
                        {step.detail}
                      </p>
                    )}

                    {step.badge && (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge
                          variant="outline"
                          className={cn(step.badge.className)}
                        >
                          {step.badge.label}
                        </Badge>
                        {step.id === 'payment' && canRefund && !isRefunded && (
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-7 text-xs px-2.5"
                            onClick={() => setRefundDialogOpen(true)}
                            disabled={isRefunding}
                          >
                            Refund customer
                          </Button>
                        )}
                        {step.id === 'refund' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs px-2.5"
                            onClick={() => {
                              setCalculationNow(new Date())
                              setCalculationDialogOpen(true)
                            }}
                          >
                            View calculations
                          </Button>
                        )}
                        {step.id === 'payment' && !isRefunded && (getWorkType(task) !== 'post_work' || paymentCaptured) && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs px-2.5"
                            onClick={() => {
                              setCalculationNow(new Date())
                              setCalculationDialogOpen(true)
                            }}
                          >
                            View calculations
                          </Button>
                        )}
                      </div>
                    )}
                    {!step.badge && step.id === 'payment' && canRefund && !isRefunded && (
                      <div className="mt-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-7 text-xs px-2.5"
                          onClick={() => setRefundDialogOpen(true)}
                          disabled={isRefunding}
                        >
                          Refund customer
                        </Button>
                      </div>
                    )}

                    {step.id === 'helper' && task.bookingSource === 'book_now' && (
                      <div className="mt-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            partnerConfirmed
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200',
                          )}
                        >
                          {partnerConfirmed ? 'Confirmed by partner' : 'Not confirmed by partner'}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {status === 'open' && !task.assignedTo && onAssignHelper && (
            <Button variant="outline" size="sm" onClick={onAssignHelper}>
              Assign helper manually
            </Button>
          )}

          {status === 'review' && (
            <Button variant="outline" size="sm" onClick={scrollToProof}>
              View proof
            </Button>
          )}
        </div>

        <Dialog open={calculationDialogOpen} onOpenChange={setCalculationDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Cancellation calculation</DialogTitle>
              <DialogDescription>
                {cancellationCalculation.workType} policy evaluated using the payment and schedule data on this work.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-1 gap-2 rounded-md border border-gray-200 bg-gray-50 p-3 sm:grid-cols-2">
                <div><span className="text-gray-500">Work posted</span><p className="font-medium">{formatDateTime(cancellationCalculation.postedAt)}</p></div>
                <div><span className="text-gray-500">Payment captured</span><p className="font-medium">{formatDateTime(cancellationCalculation.paymentAt)}</p></div>
                <div><span className="text-gray-500">Work starts</span><p className="font-medium">{cancellationCalculation.workStartAt ? formatDateTime(cancellationCalculation.workStartAt) : 'Unavailable'}</p></div>
                <div><span className="text-gray-500">{isRefunded ? 'Cancelled at' : 'Evaluated at'}</span><p className="font-medium">{formatDateTime(cancellationCalculation.evaluatedAt)}</p></div>
              </div>
              <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                <span className="text-gray-500">Time status</span>
                <span className="font-medium text-gray-900">{cancellationCalculation.timeStatus}</span>
              </div>
              <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
                <p className="font-semibold text-blue-900">{cancellationCalculation.policy}</p>
                <p className="mt-1 text-blue-800">{cancellationCalculation.policyDetail}</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between"><span className="text-gray-500">Total amount paid</span><span className="font-medium">{money(cancellationCalculation.paidAmount)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Policy cancellation fee</span><span className="font-medium text-red-700">{money(cancellationCalculation.policyFee)}</span></div>
                {isRefunded && actualRefundAmount !== null && Number.isFinite(actualRefundAmount) ? (
                  <div className="flex justify-between border-t border-gray-200 pt-2"><span className="font-semibold">Amount refunded</span><span className="font-semibold text-emerald-700">{money(actualRefundAmount)}</span></div>
                ) : (
                  <div className="flex justify-between border-t border-gray-200 pt-2"><span className="font-semibold">Calculated refund</span><span className="font-semibold text-emerald-700">{money(cancellationCalculation.refundAmount)}</span></div>
                )}
              </div>
              <p className="rounded-md bg-gray-100 p-2 font-mono text-xs text-gray-700">{isRefunded && actualRefundAmount !== null && Number.isFinite(actualRefundAmount) ? `${money(cancellationCalculation.paidAmount)} paid - ${money(Math.max(0, cancellationCalculation.paidAmount - actualRefundAmount))} retained = ${money(actualRefundAmount)} refunded` : cancellationCalculation.formula}</p>
              <p className="text-xs text-gray-500">The amount paid includes any captured tax. Tax is refunded as part of the remaining refund; it is not calculated as a separate line.</p>
              {cancellationCalculation.isEstimate && <p className="text-xs text-amber-700">This is a live estimate based on the current time. The final amount is determined when cancellation is submitted.</p>}
            </div>
          </DialogContent>
        </Dialog>

        <Separator />

        <div className="space-y-3">
          <SectionLabel>Payment &amp; payout</SectionLabel>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-600">Customer paid</span>
              <span className={cn('font-medium', paymentCaptured ? 'text-emerald-600' : 'text-amber-600')}>
                {paymentCaptured ? `${formatCurrency(task.budget)} captured` : 'Not yet captured'}
              </span>
            </div>
            {isRefunded && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-gray-600">Customer refund</span>
                <span className="font-medium text-emerald-600">
                  {formatCurrency(hasMatchingRefundRecord && refund?.refundAmount ? Number(refund.refundAmount) : task.budget)} refunded
                </span>
              </div>
            )}
            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-600">Escrow</span>
              <span className={getEscrowValueClass(escrowStatus)}>{escrowStatus}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-600">Helper payout</span>
              <span className={getPayoutValueClass(payoutStatus)}>{payoutStatus}</span>
            </div>
          </div>
        </div>

        <Separator />

        <div ref={proofSectionRef} className="space-y-3 scroll-mt-6">
          <SectionLabel>Completion proof</SectionLabel>
          {!task.completionProof || task.completionProof.length === 0 ? (
            <p className="text-sm text-gray-400 italic">
              No proof submitted yet — appears when task reaches review.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {task.completionProof.map((proof, index) => (
                  <a
                    key={`${proof.url}-${index}`}
                    href={proof.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block h-20 w-20 overflow-hidden rounded-md border border-gray-200 bg-gray-50"
                  >
                    <img
                      src={proof.url}
                      alt={`Completion proof ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </a>
                ))}
              </div>
              {task.completionNotes && (
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {task.completionNotes}
                </p>
              )}
            </div>
          )}
        </div>

        <Separator />

        <div className="space-y-3">
          <SectionLabel>Customer rating</SectionLabel>
          {!task.customerRating ? (
            <p className="text-sm text-gray-400 italic">
              No rating yet — appears after task is completed.
            </p>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star
                    key={index}
                    className={cn(
                      'h-4 w-4',
                      index < Math.round(task.customerRating ?? 0)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-gray-300',
                    )}
                  />
                ))}
                <span className="ml-2 text-sm font-medium text-gray-900">
                  {task.customerRating}/5
                </span>
              </div>
              {task.customerReview && (
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {task.customerReview}
                </p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>

    <AlertDialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Refund full amount of {formatCurrency(fullRefundAmount)} to customer?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span>
              Are you sure you want to refund this payment? The complete amount of{' '}
              <strong className="text-gray-900 font-semibold">{formatCurrency(fullRefundAmount)}</strong>{' '}
              paid by the customer (including {formatCurrency(task.budget)} work amount + all GST/taxes and fees) will be refunded directly to their original payment source via Razorpay.
            </span>
            <span className="block text-xs text-red-600 font-medium mt-1">
              This action will reverse the transaction and cannot be undone.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isRefunding}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-red-600 text-white hover:bg-red-700"
            disabled={isRefunding}
            onClick={() => {
              onRefundCustomer?.()
              setRefundDialogOpen(false)
            }}
          >
            {isRefunding ? 'Processing...' : `Confirm refund (${formatCurrency(fullRefundAmount)})`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  )
}
