import { Suspense } from 'react'
import NecesidadesPage from "@/components/necesidades/NecesidadesPage"

export default function PageNecesidades() {
  return (
    <Suspense>
      <NecesidadesPage />
    </Suspense>
  )
}
