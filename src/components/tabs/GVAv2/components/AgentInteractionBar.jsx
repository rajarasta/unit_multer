import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bot, Loader2, Mic, Send, Sparkles, Square, X } from 'lucide-react';

export default function AgentInteractionBar({ agent, processCommand }) {
  const [textInput, setTextInput] = useState('');
  const handleTextSubmit = (e) => { e.preventDefault(); if (textInput.trim()) { processCommand(textInput.trim()); setTextInput(''); } };
  const toggleListening = () => { agent.isListening ? agent.stopListening() : agent.startListening(); };
  const isProcessing = agent.state==='processing';
  return (
    <div className="relative">
      <div className="px-8 pb-6 pt-2">
        {false && agent.lastResponse && !isProcessing && (
          <AnimatePresence>
            <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="mb-3 text-sm text-center text-secondary flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 text-accent"/>
              <span className="font-medium">{agent.lastResponse.tts}</span>
              <button onClick={agent.resetAgent} className="text-subtle hover:text-primary transition" title="Očisti odgovor"><X size={14}/></button>
            </motion.div>
          </AnimatePresence>
        )}
        <div className="panel rounded-full shadow-2xl p-2 flex items-center gap-3">
          <div className="pl-3">
            {isProcessing ? (
              <motion.div animate={{rotate:360}} transition={{duration:1.5,repeat:Infinity,ease:'linear'}}>
                <Loader2 className="w-6 h-6 text-accent"/>
              </motion.div>
            ) : agent.isListening ? (
              <motion.div animate={{scale:[1,1.2,1]}} transition={{duration:1,repeat:Infinity}}>
                <Bot className="w-6 h-6 text-red-500"/>
              </motion.div>
            ) : (
              <Bot className="w-6 h-6 text-subtle"/>
            )}
          </div>
          <form onSubmit={handleTextSubmit} className="flex-1">
            <input type="text" value={agent.transcript || textInput} onChange={(e)=>setTextInput(e.target.value)} placeholder={agent.isListening? 'Govorite sada...' : "Naredi agentu (npr. 'Pomakni P-001 za 2 dana')..."} className="w-full bg-transparent focus:outline-none text-primary placeholder-text-subtle" disabled={isProcessing || agent.isListening} />
          </form>
          <div className="flex items-center gap-2">
            <button onClick={toggleListening} className={`p-3 rounded-full transition-colors shadow-md ${agent.isListening ? 'bg-red-500 text-white' : 'input-bg text-subtle hover:text-primary border border-theme'}`} title="Glasovna naredba">{agent.isListening ? <Square size={20}/> : <Mic size={20}/>}</button>
            <button onClick={handleTextSubmit} className="p-3 rounded-full bg-accent text-white transition hover:opacity-90 disabled:opacity-50 shadow-md" disabled={isProcessing || agent.isListening || (!textInput.trim() && !agent.transcript)} title="Pošalji naredbu"><Send size={20}/></button>
          </div>
        </div>
      </div>
    </div>
  );
}

