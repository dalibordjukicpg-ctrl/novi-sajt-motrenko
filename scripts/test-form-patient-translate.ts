import {
  getTranslateProvider,
  isFormPatientTranslationEnabled,
  machineTranslateTextsToMe,
} from "@/lib/machine-translate";

async function main() {
  console.log("Provajder:", getTranslateProvider());
  console.log("Prevod teksta pacijenta (PDF):", isFormPatientTranslationEnabled());

  const ru = "Хочу записаться на консультацию по ЭКО";
  const [out] = await machineTranslateTextsToMe([ru], "ru");
  console.log("RU original:", ru);
  console.log("ME prevod:", out);
  console.log("OK");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
