import ReadingSession from "@/features/reading/ReadingSession";
import { SYSTEM_TEST_TEXT } from "@/lib/utils";

export default function SystemTestPage() {
  return (
    <ReadingSession
      title="System Test"
      text={SYSTEM_TEST_TEXT}
      nextHref="/reading"
      nextLabel="Start reading"
    />
  );
}
