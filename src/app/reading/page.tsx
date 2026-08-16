import ReadingSession from "@/features/reading/ReadingSession";
import { SAMPLE_TEXT } from "@/lib/utils";

export default function ReadingPage() {
  return (
    <ReadingSession
      title="The Ant and the Chrysalis"
      text={SAMPLE_TEXT}
      nextHref="/comprehension-test"
      nextLabel="Take comprehension test"
    />
  );
}
