'use client';

interface DeleteConfirmModalProps {
  spaceName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteConfirmModal({ spaceName, onConfirm, onCancel }: DeleteConfirmModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200]">
      <div className="bg-white rounded-2xl w-[400px] max-w-[90%] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-[18px] font-semibold text-[#0f0f0f] mb-2">Delete Space</h3>
        <p className="text-[13px] text-[#777] mb-6">
          Are you sure you want to delete "<span className="font-medium text-[#0f0f0f]">{spaceName}</span>"? 
          All messages and files in this space will be permanently lost.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-[13px] font-medium text-[#777] hover:bg-[#f2f1ee] transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg text-[13px] font-medium bg-[#dc2626] text-white hover:bg-[#b91c1c] transition"
          >
            Delete Space
          </button>
        </div>
      </div>
    </div>
  );
}