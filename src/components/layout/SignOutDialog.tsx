import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { IconLogOut } from '../icons';

/** Confirmation dialog shown before signing out, built on the shared `Modal` primitive. */
export function SignOutDialog({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal open onClose={onCancel} width={360}>
      <div className="flex flex-col items-center text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-error-pale">
          <IconLogOut size={20} className="text-error" />
        </div>
        <h2 className="mt-3.5 text-[15px] font-semibold text-text-primary">Sign out</h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-text-secondary">
          Are you sure you want to sign out of your account?
        </p>
        <div className="mt-5 flex w-full gap-2.5">
          <Button variant="secondary" fullWidth onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="danger" fullWidth onClick={onConfirm}>
            Sign Out
          </Button>
        </div>
      </div>
    </Modal>
  );
}
