import ReadingSession from "@/features/reading/ReadingSession";
import { SAMPLE_TEXT } from "@/lib/utils";

export default function ReadingPage() {
  return (
    <ReadingSession
      title="The Last Light in the Library"
      text={SAMPLE_TEXT}
      nextHref="/comprehension-test"
      nextLabel="Take comprehension test"
    />
  );
}
