import React, { useState, useEffect } from 'react';
import Modal from '@/Components/Modal';
import { MessageCircle, FileText } from 'lucide-react';
import { executeWhatsAppShare } from '@/utils/pdfGenerator';

/**
 * A reusable modal for confirming WhatsApp share details.
 */
export default function WhatsAppShareModal({
    show,
    onClose,
    documentDoc,
    filename,
    defaultPhone = '',
    message = '',
    previewTitle = 'Document',
    previewSubtitle = ''
}) {
    const [phone, setPhone] = useState('');
    const [msgContent, setMsgContent] = useState('');
    const [sending, setSending] = useState(false);

    useEffect(() => {
        if (show) {
            setPhone(defaultPhone || '');
            setMsgContent(message || '');
            setSending(false);
        }
    }, [show, defaultPhone, message]);

    const handleSend = async () => {
        if (!phone.trim()) return;
        
        setSending(true);
        try {
            await executeWhatsAppShare(documentDoc, filename, phone.trim(), msgContent);
            onClose();
        } catch (error) {
            console.error('Failed to share via WhatsApp:', error);
        } finally {
            setSending(false);
        }
    };

    return (
        <Modal show={show} maxWidth="md" onClose={onClose}>
            <div className="p-8">
                <div className="flex items-start gap-4 mb-6">
                    <div className="rounded-2xl bg-emerald-500/10 p-3">
                        <MessageCircle className="w-6 h-6 text-emerald-500" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Send via WhatsApp</h3>
                        <p className="text-sm text-slate-500 mt-1">
                            {previewTitle}
                            {previewSubtitle ? ` • ${previewSubtitle}` : ''}
                        </p>
                    </div>
                </div>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-2">WhatsApp Number</label>
                        <input 
                            type="text" 
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                            placeholder="e.g. 0771234567 or +94771234567"
                            className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all dark:text-white"
                        />
                        <p className="text-xs text-slate-400 mt-2">Make sure to include the country code if it's an international number.</p>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-2">Message</label>
                        <textarea
                            rows="6"
                            value={msgContent}
                            onChange={e => setMsgContent(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all dark:text-white scrollbar-thin resize-y"
                        />
                    </div>
                    
                    <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800 mt-6">
                        <button 
                            type="button" 
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            type="button"
                            disabled={!phone.trim() || sending}
                            onClick={handleSend}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
                        >
                            <MessageCircle className="w-4 h-4" />
                            {sending ? 'Sending...' : 'Send Message'}
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
