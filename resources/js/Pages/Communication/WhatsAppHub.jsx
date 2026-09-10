import { useState, useEffect } from 'react';
import { Head, useForm, usePage } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';
import {
    MessageCircle, CheckCircle2, XCircle, Settings2, Send, Phone,
    RefreshCw, AlertCircle, Info, Zap, Eye, ExternalLink,
} from 'lucide-react';

function ConnectionStatus({ connected }) {
    return (
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
            connected
                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
        }`}>
            {connected ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
            {connected ? 'Connected' : 'Not Connected'}
        </div>
    );
}

function MessageCard({ msg, selected, onClick }) {
    return (
        <button
            onClick={onClick}
            className={`w-full text-left px-4 py-3.5 flex items-start gap-3 transition-colors border-b border-gray-100 dark:border-slate-700/60 last:border-0 ${
                selected
                    ? 'bg-primary-50 dark:bg-primary-900/20'
                    : 'hover:bg-gray-50 dark:hover:bg-slate-700/30'
            }`}
        >
            <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm">
                    {msg.name.charAt(0)}
                </div>
                {msg.unread && (
                    <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-800" />
                )}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm text-gray-900 dark:text-white truncate">{msg.name}</span>
                    <span className="text-xs text-gray-400 flex-shrink-0">{msg.time}</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{msg.message}</p>
            </div>
        </button>
    );
}

function MessageBubble({ msg, isOwn }) {
    return (
        <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3`}>
            <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                isOwn
                    ? 'bg-emerald-500 text-white rounded-br-sm'
                    : 'bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-slate-600 rounded-bl-sm shadow-sm'
            }`}>
                <p>{msg.message}</p>
                <p className={`text-[10px] mt-1 text-right ${isOwn ? 'text-emerald-100' : 'text-gray-400'}`}>{msg.time}</p>
            </div>
        </div>
    );
}

export default function WhatsAppHub({ settings = {} }) {
    const { flash } = usePage().props;
    const [activeTab, setActiveTab] = useState('messages');
    const [selectedMsg, setSelectedMsg] = useState(null);
    const [reply, setReply] = useState('');
    const [messages, setMessages] = useState([]);
    const [toast, setToast] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    const isConnected = !!(settings.whatsapp_api_key && settings.whatsapp_phone_number);

    const { data, setData, post, processing, errors } = useForm({
        whatsapp_api_key:      settings.whatsapp_api_key      ?? '',
        whatsapp_phone_number: settings.whatsapp_phone_number ?? '',
        whatsapp_instance_id:  settings.whatsapp_instance_id  ?? '',
        whatsapp_auto_send:    settings.whatsapp_auto_send === '1' || settings.whatsapp_auto_send === true,
    });

    useEffect(() => {
        if (flash?.success) {
            setToast({ type: 'success', msg: flash.success });
            setTimeout(() => setToast(null), 4000);
        }
        if (flash?.error) {
            setToast({ type: 'error', msg: flash.error });
            setTimeout(() => setToast(null), 4000);
        }
    }, [flash]);

    const handleSend = () => {
        if (!selectedMsg || !reply.trim()) return;
        const newMsg = {
            id: Date.now(),
            name: selectedMsg.name,
            phone: selectedMsg.phone,
            message: reply.trim(),
            time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            status: 'sent',
            unread: false,
        };
        setMessages(prev => [...prev, newMsg]);
        setReply('');
    };

    const handleRefresh = () => {
        setRefreshing(true);
        setTimeout(() => setRefreshing(false), 1200);
    };

    const handleSaveSettings = (e) => {
        e.preventDefault();
        post(route('communication.whatsapp.settings'));
    };

    const chatMessages = messages.filter(m => m.phone === selectedMsg?.phone);

    return (
        <MainLayout pageTitle="WhatsApp Hub">
            <Head title="WhatsApp Hub" />

            {/* Toast */}
            {toast && (
                <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold text-white ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}>
                    {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    {toast.msg}
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                        <MessageCircle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white">WhatsApp Hub</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Messaging &amp; automation centre</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <ConnectionStatus connected={isConnected} />
                    <button
                        onClick={handleRefresh}
                        className="p-2 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Status banner when not connected */}
            {!isConnected && (
                <div className="mb-6 flex items-start gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-sm">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold">WhatsApp not configured</p>
                        <p className="text-xs mt-0.5">Go to the <button onClick={() => setActiveTab('settings')} className="underline font-medium">Settings tab</button> to enter your API key and phone number to enable messaging.</p>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-gray-100 dark:bg-slate-800 rounded-2xl mb-6 w-fit">
                {[
                    { id: 'messages', label: 'Messages', icon: MessageCircle },
                    { id: 'settings', label: 'Settings', icon: Settings2 },
                ].map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        onClick={() => setActiveTab(id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                            activeTab === id
                                ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                    >
                        <Icon className="w-4 h-4" />
                        {label}
                    </button>
                ))}
            </div>

            {/* Messages Tab */}
            {activeTab === 'messages' && (
                <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-0 rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800 shadow-sm" style={{ height: '520px' }}>

                    {/* Conversation list */}
                    <div className="border-r border-gray-200 dark:border-slate-700 flex flex-col">
                        <div className="p-4 border-b border-gray-100 dark:border-slate-700">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Conversations ({messages.filter(m => m.unread).length} unread)</p>
                        </div>
                        <div className="flex-1 overflow-y-auto scrollbar-none">
                            {messages.length === 0 ? (
                                <div className="px-4 py-10 text-center text-sm text-gray-400 dark:text-gray-500">
                                    <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-40" />
                                    <p>No conversations yet.</p>
                                    <p className="text-xs mt-1">When WhatsApp is connected, messages will appear here.</p>
                                </div>
                            ) : (
                                [...new Map(messages.map(m => [m.phone, m])).values()].map(msg => (
                                    <MessageCard
                                        key={msg.id}
                                        msg={msg}
                                        selected={selectedMsg?.phone === msg.phone}
                                        onClick={() => setSelectedMsg(msg)}
                                    />
                                ))
                            )}
                        </div>
                    </div>

                    {/* Chat view */}
                    <div className="flex flex-col">
                        {selectedMsg ? (
                            <>
                                {/* Chat header */}
                                <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/40">
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                        {selectedMsg.name.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-sm text-gray-900 dark:text-white">{selectedMsg.name}</p>
                                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                            <Phone className="w-3 h-3" />
                                            {selectedMsg.phone}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xs text-emerald-500 font-medium flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
                                            Online
                                        </span>
                                    </div>
                                </div>

                                {/* Messages */}
                                <div className="flex-1 overflow-y-auto p-5 space-y-1 bg-gray-50/50 dark:bg-slate-900/20">
                                    {chatMessages.map(msg => (
                                        <MessageBubble key={msg.id} msg={msg} isOwn={msg.status === 'sent'} />
                                    ))}
                                </div>

                                {/* Reply box */}
                                <div className="flex items-center gap-3 px-4 py-3 border-t border-gray-100 dark:border-slate-700">
                                    <input
                                        type="text"
                                        value={reply}
                                        onChange={e => setReply(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleSend()}
                                        placeholder={isConnected ? 'Type a message…' : 'Configure WhatsApp to send messages'}
                                        disabled={!isConnected}
                                        className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                    <button
                                        onClick={handleSend}
                                        disabled={!isConnected || !reply.trim()}
                                        className="p-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <Send className="w-4 h-4" />
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-gray-400">
                                <div className="text-center">
                                    <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-slate-600" />
                                    <p>{messages.length === 0 ? 'No messages yet' : 'Select a conversation'}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
                <form onSubmit={handleSaveSettings} className="max-w-2xl space-y-6">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6 space-y-5">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                                <Zap className="w-5 h-5 text-emerald-500" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white">WhatsApp API Configuration</h3>
                                <p className="text-xs text-gray-400">Connect via WhatsApp Business API</p>
                            </div>
                        </div>

                        {/* Info box */}
                        <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 text-sm">
                            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="font-medium">How to get your API credentials</p>
                                <p className="text-xs mt-1 text-blue-700 dark:text-blue-400">Register at <a href="https://www.callmebot.com/blog/free-api-whatsapp-messages/" target="_blank" rel="noreferrer" className="underline font-medium inline-flex items-center gap-1">CallMeBot <ExternalLink className="w-3 h-3" /></a> or use the official <a href="https://business.whatsapp.com/products/business-platform" target="_blank" rel="noreferrer" className="underline font-medium inline-flex items-center gap-1">WhatsApp Business API <ExternalLink className="w-3 h-3" /></a>.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Phone Number</label>
                                <input
                                    type="text"
                                    value={data.whatsapp_phone_number}
                                    onChange={e => setData('whatsapp_phone_number', e.target.value)}
                                    placeholder="+94 7X XXX XXXX"
                                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                                />
                                {errors.whatsapp_phone_number && <p className="text-xs text-red-500 mt-1">{errors.whatsapp_phone_number}</p>}
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Instance ID</label>
                                <input
                                    type="text"
                                    value={data.whatsapp_instance_id}
                                    onChange={e => setData('whatsapp_instance_id', e.target.value)}
                                    placeholder="instance_xxxxx"
                                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                                />
                                {errors.whatsapp_instance_id && <p className="text-xs text-red-500 mt-1">{errors.whatsapp_instance_id}</p>}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">API Key / Token</label>
                            <input
                                type="password"
                                value={data.whatsapp_api_key}
                                onChange={e => setData('whatsapp_api_key', e.target.value)}
                                placeholder="Your WhatsApp API token"
                                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                            />
                            {errors.whatsapp_api_key && <p className="text-xs text-red-500 mt-1">{errors.whatsapp_api_key}</p>}
                        </div>

                        {/* Auto-send toggle */}
                        <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-slate-700">
                            <div>
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">Auto-send invoice on delivery</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Automatically send a WhatsApp message when a bill is marked as delivered</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer ml-4 flex-shrink-0">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={data.whatsapp_auto_send}
                                    onChange={e => setData('whatsapp_auto_send', e.target.checked)}
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500" />
                            </label>
                        </div>

                        {/* Connection status */}
                        <div className={`flex items-center justify-between p-4 rounded-xl border ${isConnected ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20' : 'border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/30'}`}>
                            <div className="flex items-center gap-3">
                                <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                                <div>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{isConnected ? 'WhatsApp Connected' : 'Not Connected'}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{isConnected ? `Sending from: ${data.whatsapp_phone_number}` : 'Enter credentials above to connect'}</p>
                                </div>
                            </div>
                            <ConnectionStatus connected={isConnected} />
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                type="submit"
                                disabled={processing}
                                className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                            >
                                {processing ? 'Saving…' : 'Save WhatsApp Settings'}
                            </button>
                        </div>
                    </div>
                </form>
            )}
        </MainLayout>
    );
}
