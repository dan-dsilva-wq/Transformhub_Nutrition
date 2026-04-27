import { notFound } from "next/navigation";
import { LessonScreen } from "@/components/pace/foods/lesson-screen";
import { lessonsById, type LessonId } from "@/components/pace/foods/lessons";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await params;
  if (!(lessonId in lessonsById)) notFound();
  return <LessonScreen lessonId={lessonId as LessonId} />;
}
