import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProjectStore } from '../store/useProjectStore';

const BatchExecutionDialog = ({ isOpen, onClose, onConfirm, planSummary, todoCount }) => {
  const [skipConfirmations, setSkipConfirmations] = useState(false);
  const { setSkipConfirmations: setGlobalSkipConfirmations, setBatchExecutionMode } = useProjectStore();

  const handleConfirm = () => {
    setGlobalSkipConfirmations(skipConfirmations);
    setBatchExecutionMode(true);
    onConfirm(skipConfirmations);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 shadow-xl"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-4 text-gray-800">
              Plan Execution Mode
            </h2>
            
            <div className="mb-4">
              <p className="text-gray-600 mb-2">
                Ready to execute plan with {todoCount} tasks:
              </p>
              <div className="bg-gray-50 p-3 rounded max-h-32 overflow-y-auto">
                <p className="text-sm text-gray-700 whitespace-pre-line">
                  {planSummary}
                </p>
              </div>
            </div>

            <div className="mb-6">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={skipConfirmations}
                  onChange={(e) => setSkipConfirmations(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  <strong>Execute all steps without confirmation</strong>
                  <br />
                  <span className="text-xs text-gray-500">
                    Claude will complete all tasks automatically without asking for permission at each step
                  </span>
                </span>
              </label>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                {skipConfirmations ? 'Execute All' : 'Execute Step by Step'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BatchExecutionDialog;