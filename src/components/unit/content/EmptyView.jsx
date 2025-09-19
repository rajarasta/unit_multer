import React from 'react';
import { motion } from 'framer-motion';
import { Upload, FileText, Type, Mic, MicOff } from 'lucide-react';

const EmptyView = ({
  isDragOver,
  handleFileChange,
  textInputValue,
  handleTextChange,
  handleTextKeyPress,
  speechSupported,
  isListening,
  startListening,
  stopListening,
  getSupportedTypeIcons
}) => {
  return (
    <div
      className={`h-full flex flex-col relative bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg transition-all duration-300 ${
        isDragOver ? 'border-blue-400 bg-blue-50/30 shadow-lg shadow-blue-500/20' : 'hover:bg-white/30'
      }`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-lg pointer-events-none" />

      <div className="absolute top-2 right-2 flex flex-wrap gap-1.5 z-10">
        {getSupportedTypeIcons().map((type, index) => (
          <motion.div
            key={type.label}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className={`${type.color} opacity-40 hover:opacity-80 transition-all duration-200 hover:scale-110 cursor-help`}
            title={type.label}
          >
            <type.icon size={14} className="drop-shadow-sm" />
          </motion.div>
        ))}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center text-slate-600 space-y-6 relative z-10">
        <motion.div
          className="text-5xl text-slate-400"
          animate={{
            scale: isDragOver ? 1.1 : 1,
            color: isDragOver ? '#3b82f6' : '#94a3b8'
          }}
          transition={{ duration: 0.2 }}
        >
          <Upload size={40} className="drop-shadow-md" />
        </motion.div>

        <div className="text-sm text-center space-y-2">
          <p className="text-slate-500 font-medium">Drop files here or</p>
          <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/80 hover:bg-blue-600/90 text-white rounded-lg cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg backdrop-blur-sm">
            <FileText size={16} />
            <span className="font-medium">Browse Files</span>
            <input
              type="file"
              className="hidden"
              onChange={handleFileChange}
              multiple={false}
            />
          </label>
        </div>

        <div className="w-full px-4">
          <div className="relative">
            <textarea
              placeholder="...or start typing/speaking something amazing (Press Enter to confirm)"
              value={textInputValue}
              className="w-full h-20 p-4 text-sm bg-white/50 border border-white/50 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 backdrop-blur-sm transition-all duration-200 placeholder-slate-400"
              onChange={handleTextChange}
              onKeyPress={handleTextKeyPress}
            />
            <div className="absolute bottom-2 right-2 flex items-center gap-2">
              {speechSupported && (
                <motion.button
                  onClick={isListening ? stopListening : startListening}
                  title={isListening ? 'Stop listening' : 'Start voice input'}
                  className={`relative group transition-all duration-200 p-1.5 rounded-lg ${
                    isListening
                      ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                      : 'text-slate-400 hover:text-blue-500 hover:bg-blue-50/50'
                  }`}
                  animate={{
                    scale: isListening ? [1, 1.1, 1] : 1,
                    boxShadow: isListening
                      ? [
                          '0 0 0 0 rgba(239, 68, 68, 0.7)',
                          '0 0 0 10px rgba(239, 68, 68, 0)',
                          '0 0 0 0 rgba(239, 68, 68, 0)'
                        ]
                      : '0 0 0 0 rgba(239, 68, 68, 0)'
                  }}
                  transition={{ duration: 1.5, repeat: isListening ? Infinity : 0, ease: 'easeInOut' }}
                >
                  {isListening ? <MicOff size={14} /> : <Mic size={14} />}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                    {isListening ? 'Stop listening' : 'Start voice input'}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-2 border-transparent border-t-slate-800"></div>
                  </div>
                </motion.button>
              )}
              <div className="text-xs text-slate-400">
                <Type size={12} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmptyView;

