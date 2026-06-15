'use client';

import { X, AlertTriangle } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: any;
}

export default function DeleteConfirmModal({ isOpen, onClose, item }: DeleteConfirmModalProps) {
  if (!isOpen) return null;

  const itemName = item?.name || item?.title || 'this item';
  const itemType = item?.type === 'space' ? 'Space' : 'Item';

  const handleDelete = async () => {
    // The actual delete logic should be handled by the parent component
    // This modal just confirms the action
    onClose();
    // Parent will handle the actual deletion via onDeleteRequest
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={24} className="text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete {itemType}</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to delete "<span className="font-semibold text-gray-900">{itemName}</span>"? 
              All messages and files in this {itemType.toLowerCase()} will be permanently lost.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition"
              >
                Delete {itemType}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}