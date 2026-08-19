export const SAMPLE_TEXT = `Every afternoon, seventeen-year-old Mara walked past the old town library on her way
home from school. The building stood between a busy market and a narrow street lined with small
houses. Its windows were tall and dusty, and the wooden doors had become darker with age.
Although the library was no longer as popular as it had been years before, Mara often noticed a
single light glowing inside long after sunset.

One rainy afternoon, curiosity finally persuaded her to enter.

The librarian, Mr. Elias, was sitting behind the front desk. He looked up from a book and
smiled when Mara asked why the library remained open so late.

"Some books are still waiting to be read," he replied.

Mara thought he was joking, but Mr. Elias pointed toward a wooden cabinet at the back of
the room. Inside were dozens of old books covered with thin layers of dust. Their titles were
difficult to read because many of the covers had faded.

"What makes those books different?" Mara asked.

"They belonged to people who lived here before the town became crowded," Mr. Elias
explained. "Some contain commonplace stories. Others contain records of events that people
have forgotten."

Mara became interested. She selected a small blue book and opened it carefully. The first
pages contained descriptions of the town more than sixty years earlier. There were photographs
of streets that no longer existed, drawings of houses that had been demolished, and handwritten
accounts of floods, celebrations, and important community meetings.

As she continued reading, Mara discovered something unexpected. One entry described
a severe flood that had occurred decades earlier. According to the account, the floodwater had
risen unusually quickly because a narrow canal behind the market had become blocked by debris.
Mara immediately remembered something her science teacher had said that morning. The town's
drainage system was becoming increasingly difficult to maintain because of construction and
accrued waste.

She returned to the beginning of the entry and read it again.

The old record did not explain exactly what had happened to the canal after the flood.
However, it mentioned that several residents had organized a cleanup project and had asked local
officials to improve the drainage system. Mara wondered whether the problem had truly been
solved or whether the town had simply forgotten about it.

The following day, she returned to the library and told Mr. Elias what she had discovered.
He listened quietly.

"Why do you think people stopped talking about the flood?" he asked.

Mara considered the question. "Maybe because people remember events differently as
time passes," she said. "Or perhaps newer problems seemed more important."

Mr. Elias nodded. "That is possible. But there is another reason. Communities sometimes
lose useful knowledge when people stop preserving their experiences." He showed Mara another
section of the cabinet. It contained notebooks, newspapers, maps, and letters donated by former
residents. Some documents described successful community projects, while others recorded
mistakes that had caused serious problems. Mara suddenly understood why Mr. Elias had kept
the library open late. The old books were not valuable simply because they were old. They
contained information that could help people understand how the town had changed.

A few weeks later, Mara presented her discovery to her classmates. She suggested that
they investigate the town's current drainage problems and compare them with the records
preserved in the library. At first, only a few students were interested. However, after they
scrutinized photographs and maps from the old collection, more students joined the project. They
discovered that several areas that frequently experienced flooding had once contained natural
waterways. Over the years, some had been covered by roads, buildings, and other structures.

The students did not claim that the old records provided all the answers. Instead, they realized
that the documents offered clues that could guide further investigation. Their teacher encouraged
them to interview older residents, examine current maps, and consult local officials. The project
gradually became larger than Mara had expected.

Months later, the students organized an exhibition in the library. They displayed
photographs showing how the town had changed and placed them beside modern photographs
of the same locations. Visitors were surprised by the differences.

One elderly resident stopped in front of a photograph and remained silent for several
moments.

"I remember this street," she finally said. "There used to be a stream here."

Mara looked at the photograph again. She realized that the library had preserved more
than words and pictures. It had preserved connections between the past and the present.

Before leaving that evening, Mara noticed that the familiar light was still glowing inside the
library.

This time, she understood why.

The light was not simply keeping the old building open. It was making it possible for
forgotten knowledge to become useful again.`;

export const SYSTEM_TEST_TEXT = `This is a short system test. Before the real reading passage begins, take a few
minutes here to get comfortable with the controls you will be using.
 
Press Play and watch the highlighting move steadily from word to word. Notice how
each word is briefly lit up before the next one takes its place. If the pace feels too
fast or too slow, use the speed slider, the arrow keys, or the plus and minus buttons
to adjust it until it feels comfortable to you.
 
Try pausing partway through by pressing Play again or tapping the space bar. You can
also click directly on any word you have already read to look up its meaning in the
dictionary panel on the right. If you would like to go back and reread an earlier part
of this passage, use the rewind control, then click the word you want to return to.
 
You may notice that some of the upcoming text appears blurred until the highlight
reaches it. This is expected. It simply keeps you from reading ahead of the current
pace, the same way the real assessment will work.
 
Take your time here. Play with each control more than once, try a few different
speeds, pause and resume a few times, look up a word or two, and practice rewinding
to an earlier sentence. Once the play, pause, speed, lookup, and rewind controls all
feel natural to you, you are ready to begin the real reading assessment.`;

export interface ComprehensionQuestion {
  id: string;
  category: string;
  prompt: string;
}

export const COMPREHENSION_QUESTIONS: ComprehensionQuestion[] = [
  {
    id: "q1",
    category: "Literal comprehension",
    prompt:
      "What did Mara discover in the old blue book, and what information did it contain about the town's past?",
  },
  {
    id: "q2",
    category: "Inferential comprehension",
    prompt:
      "Why did Mara begin to suspect that the town's current drainage problems might be connected to events described in the old records?",
  },
  {
    id: "q3",
    category: "Critical/inferential comprehension",
    prompt:
      'What does Mr. Elias mean when he says that communities can "lose useful knowledge when people stop preserving their experiences"? Explain using evidence from the story.',
  },
  {
    id: "q4",
    category: "Analysis",
    prompt:
      "How did the students' understanding of the town change after they compared the historical photographs, maps, and written records with the town's present condition?",
  },
  {
    id: "q5",
    category: "Higher-order/inferential comprehension",
    prompt:
      'What is the significance of the "last light" in the title and at the end of the story? What larger message does it communicate about preserving history and knowledge?',
  },
];

/**
 * When true, words ahead of the reader's furthest progress are blurred
 * and non-interactive until reached — prevents skimming ahead of the
 * highlight. This is a build-time setting only; there is no in-app
 * toggle, so change this value and redeploy to switch it on or off.
 */
export const PROGRESSIVE_REVEAL_ENABLED = true;
