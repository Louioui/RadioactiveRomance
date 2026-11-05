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
          This site is an interactive release preview for Radioactive Romance.
          The player streams the release tracks “Standing Through It All” and
          “Bleeding Out Empty.”
        </p>
        <p>
          Demo downloads are free. No payment or purchase is made. The Origin
          MP3/WAV product describes the planned release; the demo package
          contains the Shattered Canvas artwork and a short README only. No
          audio files are included in it.
        </p>
        <p>
          All music, recordings and artwork on this site are owned by
          Radioactive Romance. All rights reserved. They are provided for
          personal listening and viewing on this site only and may not be
          copied, redistributed or used commercially without the band’s
          permission. Commercial release terms will be published when the
          release goes on sale.
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
            The song is loaded into the player above. Add a hosted checkout URL
            in <code>VITE_CHECKOUT_URL</code> when you are ready to sell the
            lossless release.
          </p>
          <div className="download-spec">
            <span>MP3 + LOSSLESS WAV</span>
            <span>CHECKOUT PENDING</span>
          </div>
          <a
            className="primary-button solid"
            href="/assets/origin-demo.zip"
            download="Radioactive-Romance-Origin-Artwork.zip"
            onClick={() => setDownloaded(true)}
          >
            {downloaded ? "Download artwork again" : "Download artwork demo"}{" "}
            {downloaded ? <Check size={18} /> : <ArrowDownToLine size={18} />}
          </a>
          <p className="small-note" role="status">
            {downloaded
              ? "Download requested. Stay a little longer. There’s a secret in the heart."
              : "No payment is taken until checkout is connected."}
          </p>
        </>
      )}
    </Modal>
  );
}
