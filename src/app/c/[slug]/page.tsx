import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { getCatalogBySlug } from "@/actions/catalog"
import { CatalogPage } from "@/components/features/catalog/CatalogPage"
import { CatalogPixels } from "@/components/features/catalog/CatalogPixels"
import { CatalogQuizWrapper } from "@/components/features/catalog/CatalogQuizWrapper"

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ [key: string]: string | undefined }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const data = await getCatalogBySlug(slug)
  if (!data) return { title: "Catálogo" }
  return {
    title: data.config.title || "Catálogo",
    description: data.config.description || undefined,
    openGraph: {
      images: data.config.banner_url ? [data.config.banner_url] : [],
    },
  }
}

export default async function CatalogPublicPage({ params, searchParams }: Props) {
  const { slug } = await params
  const sp = await searchParams
  const data = await getCatalogBySlug(slug)
  if (!data) notFound()

  return (
    <>
      <CatalogPixels config={data.config} />
      <CatalogQuizWrapper
        quiz={data.quiz}
        workspaceId={data.config.workspace_id}
        accentColor={data.config.accent_color}
        whatsappNumber={data.config.whatsapp_number}
        utmSource={sp.utm_source ?? null}
        utmMedium={sp.utm_medium ?? null}
        utmCampaign={sp.utm_campaign ?? null}
      >
        <CatalogPage data={data} />
      </CatalogQuizWrapper>
    </>
  )
}
