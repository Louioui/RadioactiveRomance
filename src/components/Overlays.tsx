import { useState } from "react";
import { ArrowDownToLine, ArrowUpRight, Check } from "lucide-react";
import { Modal } from "./Modal";
import { release } from "../config/release";
export type Overlay = "band" | "origin" | "privacy" | "terms" | null;
const members = [
  ["Alex Thorne", "Clean vocals / screams"],
  ["Jamie Vane", "Lead guitar"],
  ["Sarah “Sabs” Abernathy", "Rhythm guitar"],
  ["Kaelen “Kae” Grey", "Bass guitar"],
  ["Matty “Bones” DeLuca", "Drums / percussion"],
];
export function Overlays({
  active,
  onClose,
}: {
  active: Overlay;
  onClose: () => void;
}) {
  const [downloaded, setDownloaded] = useState(false);
  if (!active) return null;
  if (active === "band")
    return (
      <Modal title="A beautiful kind of damage." onClose={onClose}>
        <p className="modal-lede">Five lives. One volatile frequency.</p>
        <p>
          Born in the ashes of failed projects and late-night studio sessions,
          Radioactive Romance lives between soaring melodies and visceral
          screams. Gothic melancholy. Industrial decay. A pulse that refuses to
          disappear.
        </p>
        <div className="lineup">
          {members.map(([name, role], i) => (
            <div key={name}>
              <span className="member-index">0{i + 1}</span>
              <strong>{name}</strong>
              <span>{role}</span>
            </div>
          ))}
        </div>
        <p className="small-note">A fictional band. A very real feeling.</p>
      </Modal>
    );
  if (active === "privacy")
    return (
      <Modal title="Your space stays yours." onClose={onClose}>
        <p>
          This demo has no analytics, advertising cookies, accounts, or email
          collection. Audio and artwork are served with the website. Your audio
          settings and secret unlock last only for this visit.
        </p>
        <p>
          The hosting service may process standard request logs. If live
          checkout is added later, its payment provider and data handling will
          be described before launch.
        </p>
      </Modal>
    );
  if (active === "terms")
    return (
      <Modal title="The fine print." onClose={onClose}>
        <p>
          Radioactive Romance is a fictional band and this site is an
          interactive demo. The included soundscape is a synthetic preview, not
          a recording of “Candlelit Cage.”
        </p>
        <p>
          Demo downloads are free. No payment or purchase is made. The Origin
          MP3/WAV product describes the planned release; the demo package
          contains a preview WAV and artwork only.
        </p>
        <p>
          Artwork and audio are provided for personal preview. Commercial
          release terms will be published when an actual release is offered.
        </p>
      </Modal>
    );
  return (
    <Modal
      title={downloaded ? "The signal is yours." : "Enter the Origin."}
      onClose={onClose}
    >
      <div className="release-cover">
        <img
          src="/assets/background.webp"
          alt="Dark roses and a radioactive gravestone"
        />
        <div>
          <span>RADIOACTIVE ROMANCE</span>
          <strong>
            Candlelit
            <br />
            Cage
          </strong>
          <span>ORIGIN / DIGITAL EDITION</span>
        </div>
      </div>
      <p className="modal-lede">One track. Every exposed nerve.</p>
      {release.checkoutUrl ? (
        <>
          <p>
            The Origin digital edition. Continue to the configured checkout to
            see release details and pricing.
          </p>
          <a className="primary-button" href={release.checkoutUrl}>
            Continue to checkout <ArrowUpRight size={18} />
          </a>
        </>
      ) : (
        <>
          <p>
            Step inside the demo. Download the original 32-second preview
            soundscape and the graveyard artwork. The full band recording isn’t
            part of this preview.
          </p>
          <div className="download-spec">
            <span>PREVIEW WAV + ARTWORK</span>
            <span>FREE DEMO</span>
          </div>
          <a
            className="primary-button solid"
            href="/assets/origin-demo.zip"
            download="Radioactive-Romance-Origin-Demo.zip"
            onClick={() => setDownloaded(true)}
          >
            {downloaded ? "Download again" : "Download the demo"}{" "}
            {downloaded ? <Check size={18} /> : <ArrowDownToLine size={18} />}
          </a>
          <p className="small-note" role="status">
            {downloaded
              ? "Download requested. Stay a little longer. There’s a secret in the heart."
              : "No payment. No email. Just the signal."}
          </p>
        </>
      )}
    </Modal>
  );
}
