import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { getCatalogBySlug } from "@/actions/catalog"
import { CatalogPage } from "@/components/features/catalog/CatalogPage"

interface Props {
  params: Promise<{ slug: string }>
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

export default async function CatalogPublicPage({ params }: Props) {
  const { slug } = await params
  const data = await getCatalogBySlug(slug)
  if (!data) notFound()
  return <CatalogPage data={data} />
}
