import { CalendarDays, Phone, Mail, Users, StickyNote } from "lucide-react"
import { getScheduledActivities } from "@/actions/activities"
import { ScheduledActivityCard } from "@/components/features/activities/ScheduledActivityCard"
import type { ScheduledActivity } from "@/actions/activities"

function startOfDay(d: Date) {
  const r = new Date(d)
  r.setHours(0, 0, 0, 0)
  return r
}

function endOfDay(d: Date) {
  const r = new Date(d)
  r.setHours(23, 59, 59, 999)
  return r
}

function isBetween(dateStr: string, from: Date, to: Date) {
  const d = new Date(dateStr)
  return d >= from && d <= to
}

function groupActivities(activities: ScheduledActivity[]) {
  const now = new Date()
  const todayStart = startOfDay(now)
  const todayEnd = endOfDay(now)

  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStart = startOfDay(tomorrow)
  const tomorrowEnd = endOfDay(tomorrow)

  // Semana: de depois de amanhã até fim do domingo da semana atual
  const weekEnd = new Date(now)
  const dayOfWeek = weekEnd.getDay()
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek
  weekEnd.setDate(weekEnd.getDate() + daysUntilSunday)
  weekEnd.setHours(23, 59, 59, 999)

  const afterTomorrowStart = new Date(tomorrowEnd)
  afterTomorrowStart.setMilliseconds(1)

  const today: ScheduledActivity[] = []
  const tomorrow_list: ScheduledActivity[] = []
  const thisWeek: ScheduledActivity[] = []
  const future: ScheduledActivity[] = []

  for (const a of activities) {
    if (isBetween(a.activity_date, todayStart, todayEnd)) {
      today.push(a)
    } else if (isBetween(a.activity_date, tomorrowStart, tomorrowEnd)) {
      tomorrow_list.push(a)
    } else if (new Date(a.activity_date) <= weekEnd) {
      thisWeek.push(a)
    } else {
      future.push(a)
    }
  }

  return { today, tomorrow: tomorrow_list, thisWeek, future }
}

interface ColumnProps {
  title: string
  subtitle: string
  activities: ScheduledActivity[]
  accent?: boolean
  showDate?: boolean
}

function Column({ title, subtitle, activities, accent, showDate }: ColumnProps) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3">
      {/* Header da coluna */}
      <div
        className={`rounded-xl border px-4 py-3 ${
          accent
            ? "border-pf-accent/30 bg-pf-accent/5"
            : "border-pf-border bg-pf-surface"
        }`}
      >
        <p className={`text-sm font-semibold ${accent ? "text-pf-accent" : "text-pf-text"}`}>
          {title}
        </p>
        <p className="text-xs text-pf-text-muted">
          {activities.length === 0
            ? "Nenhuma atividade"
            : `${activities.length} atividade${activities.length !== 1 ? "s" : ""}`}
        </p>
        {subtitle && <p className="mt-0.5 text-[10px] text-pf-text-muted">{subtitle}</p>}
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2">
        {activities.length === 0 ? (
          <div className="rounded-xl border border-dashed border-pf-border py-8 text-center">
            <p className="text-xs text-pf-text-muted">Sem atividades</p>
          </div>
        ) : (
          activities.map((a) => (
            <ScheduledActivityCard key={a.id} activity={a} showDate={showDate} />
          ))
        )}
      </div>
    </div>
  )
}

export default async function ActivitiesPage() {
  const activities = await getScheduledActivities()
  const { today, tomorrow, thisWeek, future } = groupActivities(activities)

  const now = new Date()
  const tomorrowDate = new Date(now)
  tomorrowDate.setDate(tomorrowDate.getDate() + 1)

  const todayLabel = now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "short" })
  const tomorrowLabel = tomorrowDate.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "short" })

  const totalCount = activities.length

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-heading text-xl font-bold text-pf-text">Atividades</h2>
          <p className="mt-0.5 text-sm text-pf-text-muted">
            {totalCount === 0
              ? "Nenhuma atividade agendada"
              : `${totalCount} atividade${totalCount !== 1 ? "s" : ""} agendada${totalCount !== 1 ? "s" : ""} a partir de hoje`}
          </p>
        </div>

        {/* Legenda de tipos */}
        <div className="hidden items-center gap-4 sm:flex">
          {([
            { type: "ligacao", icon: Phone, label: "Ligação", color: "#2ED573" },
            { type: "email", icon: Mail, label: "E-mail", color: "#5B7FFF" },
            { type: "reuniao", icon: Users, label: "Reunião", color: "#CAFF33" },
            { type: "nota", icon: StickyNote, label: "Nota", color: "#8A8A8F" },
          ] as const).map(({ type, icon: Icon, label, color }) => (
            <div key={type} className="flex items-center gap-1.5 text-xs text-pf-text-muted">
              <Icon className="size-3.5" style={{ color }} />
              {label}
            </div>
          ))}
        </div>
      </div>

      {totalCount === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-pf-border bg-pf-surface py-24">
          <div className="flex size-12 items-center justify-center rounded-xl border border-pf-border bg-pf-surface-2">
            <CalendarDays className="size-6 text-pf-text-muted" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-pf-text">Nenhuma atividade agendada</p>
            <p className="mt-1 text-xs text-pf-text-muted">
              Registre atividades futuras nos leads para vê-las aqui
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Column
            title="Hoje"
            subtitle={todayLabel}
            activities={today}
            accent
          />
          <Column
            title="Amanhã"
            subtitle={tomorrowLabel}
            activities={tomorrow}
          />
          <Column
            title="Esta Semana"
            subtitle="Até domingo"
            activities={thisWeek}
          />
          <Column
            title="Futuras"
            subtitle="A partir da próxima semana"
            activities={future}
            showDate
          />
        </div>
      )}
    </div>
  )
}
