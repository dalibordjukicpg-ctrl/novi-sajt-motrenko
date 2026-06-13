type Props = {
  embedUrl: string;
  title?: string;
};

export function QuestionnaireEmbed({ embedUrl, title = "Upitnik" }: Props) {
  return (
    <div className="questionnaire-embed my-8 w-full overflow-hidden rounded-xl border border-[#f0e6dc] bg-white shadow-site-card">
      <iframe
        src={embedUrl}
        title={title}
        className="block min-h-[720px] w-full border-0 sm:min-h-[800px]"
        loading="lazy"
        allow="fullscreen"
      />
    </div>
  );
}
