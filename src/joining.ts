export type ArabicJoiningGroup =
  | "AfricanFeh"
  | "AfricanNoon"
  | "AfricanQaf"
  | "Ain"
  | "Alef"
  | "Beh"
  | "BurushaskiYehBarree"
  | "Dal"
  | "FarsiYeh"
  | "Feh"
  | "Gaf"
  | "Hah"
  | "Heh"
  | "HehGoal"
  | "Kaf"
  | "Lam"
  | "Meem"
  | "Noon"
  | "Nya"
  | "Qaf"
  | "Reh"
  | "Sad"
  | "Seen"
  | "Tah"
  | "TehMarbuta"
  | "TehMarbutaGoal"
  | "Waw"
  | "Yeh"
  | "YehBarree"
  | "YehWithTail";

type JoiningType = "dual" | "right" | "causing" | "none";

const ARABIC_SCRIPT = /^\p{Script_Extensions=Arabic}$/u;
const LETTER = /^\p{Letter}$/u;

// Unicode 17.0 Joining_Type=Right_Joining characters in the Arabic blocks.
// See THIRD_PARTY_NOTICES.md. Keeping this data local avoids shipping a
// multi-megabyte Unicode database for a property that JavaScript regular
// expressions do not expose.
const RIGHT_JOINING = new Set(
  [
    0x0622, 0x0623, 0x0624, 0x0625, 0x0627, 0x0629, 0x062f, 0x0630, 0x0631, 0x0632, 0x0648, 0x0671,
    0x0672, 0x0673, 0x0675, 0x0676, 0x0677, 0x0688, 0x0689, 0x068a, 0x068b, 0x068c, 0x068d, 0x068e,
    0x068f, 0x0690, 0x0691, 0x0692, 0x0693, 0x0694, 0x0695, 0x0696, 0x0697, 0x0698, 0x0699, 0x06c0,
    0x06c3, 0x06c4, 0x06c5, 0x06c6, 0x06c7, 0x06c8, 0x06c9, 0x06ca, 0x06cb, 0x06cd, 0x06cf, 0x06d2,
    0x06d3, 0x06d5, 0x06ee, 0x06ef, 0x0759, 0x075a, 0x075b, 0x076b, 0x076c, 0x0771, 0x0773, 0x0774,
    0x0778, 0x0779, 0x0870, 0x0871, 0x0872, 0x0873, 0x0874, 0x0875, 0x0876, 0x0877, 0x0878, 0x0879,
    0x087a, 0x087b, 0x087c, 0x087d, 0x087e, 0x087f, 0x0880, 0x0881, 0x0882, 0x088e, 0x08aa, 0x08ab,
    0x08ac, 0x08ae, 0x08b1, 0x08b2, 0x08b9, 0x10ec2,
  ].map((codePoint) => String.fromCodePoint(codePoint)),
);

// Joining_Type=Non_Joining characters that are letters in the Arabic script.
const NON_JOINING = new Set(
  [0x0621, 0x0674, 0x0861, 0x0866, 0x0887, 0x0888, 0x08ad].map((codePoint) =>
    String.fromCodePoint(codePoint),
  ),
);

// Unicode 17.0 Joining_Group values used by the Naskh rules. Groups outside
// this table are deliberately ineligible rather than guessed from appearance.
const JOINING_GROUP_CHARACTERS: Readonly<Record<ArabicJoiningGroup, string>> = {
  AfricanFeh: "\u{08bb}",
  AfricanNoon: "\u{08bd}",
  AfricanQaf: "\u{08bc}\u{08c4}",
  Ain: "\u{0639}\u{063a}\u{06a0}\u{06fc}\u{075d}\u{075e}\u{075f}\u{08b3}\u{08c3}",
  Alef: "\u{0622}\u{0623}\u{0625}\u{0627}\u{0671}\u{0672}\u{0673}\u{0675}\u{0773}\u{0774}\u{0870}\u{0871}\u{0872}\u{0873}\u{0874}\u{0875}\u{0876}\u{0877}\u{0878}\u{0879}\u{087a}\u{087b}\u{087c}\u{087d}\u{087e}\u{087f}\u{0880}\u{0881}\u{0882}",
  Beh: "\u{0628}\u{062a}\u{062b}\u{066e}\u{0679}\u{067a}\u{067b}\u{067c}\u{067d}\u{067e}\u{067f}\u{0680}\u{0750}\u{0751}\u{0752}\u{0753}\u{0754}\u{0755}\u{0756}\u{08a0}\u{08a1}\u{08b6}\u{08b7}\u{08b8}\u{08be}\u{08bf}\u{08c0}",
  BurushaskiYehBarree: "\u{077a}\u{077b}",
  Dal: "\u{062f}\u{0630}\u{0688}\u{0689}\u{068a}\u{068b}\u{068c}\u{068d}\u{068e}\u{068f}\u{0690}\u{06ee}\u{0759}\u{075a}\u{08ae}\u{10ec2}",
  FarsiYeh: "\u{063d}\u{063e}\u{063f}\u{06cc}\u{06ce}\u{0775}\u{0776}",
  Feh: "\u{0641}\u{06a1}\u{06a2}\u{06a3}\u{06a4}\u{06a5}\u{06a6}\u{0760}\u{0761}\u{08a4}",
  Gaf: "\u{063b}\u{063c}\u{06a9}\u{06ab}\u{06af}\u{06b0}\u{06b1}\u{06b2}\u{06b3}\u{06b4}\u{0762}\u{0763}\u{0764}\u{088d}\u{08b0}\u{08c2}\u{08c8}",
  Hah: "\u{062c}\u{062d}\u{062e}\u{0681}\u{0682}\u{0683}\u{0684}\u{0685}\u{0686}\u{0687}\u{06bf}\u{0757}\u{0758}\u{076e}\u{076f}\u{0772}\u{077c}\u{088a}\u{08a2}\u{08c1}\u{08c5}\u{08c6}",
  Heh: "\u{0647}",
  HehGoal: "\u{06c1}\u{06c2}",
  Kaf: "\u{0643}\u{06ac}\u{06ad}\u{06ae}\u{077f}\u{08b4}\u{10ec4}",
  Lam: "\u{0644}\u{06b5}\u{06b6}\u{06b7}\u{06b8}\u{076a}\u{08a6}\u{08c7}",
  Meem: "\u{0645}\u{0765}\u{0766}\u{08a7}",
  Noon: "\u{0646}\u{06b9}\u{06ba}\u{06bb}\u{06bc}\u{0767}\u{0768}\u{0769}\u{0889}\u{088f}",
  Nya: "\u{06bd}",
  Qaf: "\u{0642}\u{066f}\u{06a7}\u{06a8}\u{08a5}\u{08b5}",
  Reh: "\u{0631}\u{0632}\u{0691}\u{0692}\u{0693}\u{0694}\u{0695}\u{0696}\u{0697}\u{0698}\u{0699}\u{06ef}\u{075b}\u{076b}\u{076c}\u{0771}\u{08aa}\u{08b2}\u{08b9}",
  Sad: "\u{0635}\u{0636}\u{069d}\u{069e}\u{06fb}\u{08af}",
  Seen: "\u{0633}\u{0634}\u{069a}\u{069b}\u{069c}\u{06fa}\u{075c}\u{076d}\u{0770}\u{077d}\u{077e}",
  Tah: "\u{0637}\u{0638}\u{069f}\u{088b}\u{088c}\u{08a3}\u{10ec3}",
  TehMarbuta: "\u{0629}\u{06c0}\u{06d5}",
  TehMarbutaGoal: "\u{06c3}",
  Waw: "\u{0624}\u{0648}\u{0676}\u{0677}\u{06c4}\u{06c5}\u{06c6}\u{06c7}\u{06c8}\u{06c9}\u{06ca}\u{06cb}\u{06cf}\u{0778}\u{0779}\u{08ab}",
  Yeh: "\u{0626}\u{0649}\u{064a}\u{0678}\u{06d0}\u{06d1}\u{0777}\u{08a8}\u{08a9}\u{08ba}\u{10ec7}",
  YehBarree: "\u{06d2}\u{06d3}",
  YehWithTail: "\u{06cd}",
};

const JOINING_GROUP = new Map<string, ArabicJoiningGroup>(
  Object.entries(JOINING_GROUP_CHARACTERS).flatMap(([group, characters]) =>
    [...characters].map((character) => [character, group as ArabicJoiningGroup]),
  ),
);

function joiningType(character: string): JoiningType {
  if (character === "\u0640" || character === "\u200d") {
    return "causing";
  }
  if (
    character === "\u200c" ||
    !ARABIC_SCRIPT.test(character) ||
    !LETTER.test(character) ||
    NON_JOINING.has(character)
  ) {
    return "none";
  }
  return RIGHT_JOINING.has(character) ? "right" : "dual";
}

export function connectsToFollowing(character: string): boolean {
  const type = joiningType(character);
  return type === "dual" || type === "causing";
}

export function acceptsConnectionFromPrevious(character: string): boolean {
  return joiningType(character) !== "none";
}

export function isArabicJoiningCharacter(character: string): boolean {
  return joiningType(character) !== "none";
}

export function isArabicLetter(character: string): boolean {
  return ARABIC_SCRIPT.test(character) && LETTER.test(character);
}

export function arabicJoiningGroup(character: string): ArabicJoiningGroup | undefined {
  return JOINING_GROUP.get(character);
}
