import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    el?.showModal();
    return () => el?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby="dialog-title"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-inner">
        <button
          className="close-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={20} />
        </button>
        <span className="modal-index">RADIOACTIVE ROMANCE / ORIGIN</span>
        <h2 id="dialog-title">{title}</h2>
        {children}
      </div>
    </dialog>
  );
}
