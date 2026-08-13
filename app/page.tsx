import { getReports } from "@/app/actions/reports"
import { RelayApp } from "@/components/relay/relay-app"

export const dynamic = "force-dynamic"

export default async function Page() {
  const initialReports = await getReports().catch(() => [])
  return <RelayApp initialReports={initialReports} />
}
