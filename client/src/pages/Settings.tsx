import { useEffect, useState } from "react";
import AudioSettings from "../components/AudioSettings";
import AppLogs from "../components/AppLogs";

export interface WindowsSettings {
    openAtLogin: boolean;
    openAsHidden: boolean;
}

export interface ConnectionInfo {
    address: string | null;
    port: number;
    interfaceName: string | null;
    connectionType: "ethernet" | "wifi" | "other" | "none";
    addresses: Array<{
        address: string;
        interfaceName: string;
        connectionType: "ethernet" | "wifi" | "other";
    }>;
}

export function SettingsCard({ title, description, children }: {
    title: string;
    description: string;
    children: React.ReactNode;
}) {
    return (
        <section className="rounded-[12px] bg-white p-[24px] shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
            <h2 className="m-0 text-[17px] font-semibold leading-[28px] text-[#1b212d]">{title}</h2>
            <p className="m-0 mt-[2px] text-[13px] leading-[20px] text-[#8792a5]">{description}</p>
            <div className="mt-[20px]">{children}</div>
        </section>
    );
}

export function SettingToggle({ title, description, checked, onChange }: {
    title: string;
    description: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}) {
    return (
        <label className="flex cursor-pointer items-center justify-between gap-[20px] rounded-[12px] bg-[#f7f8fb] px-[16px] py-[14px] transition hover:bg-[#f1f4f9]">
            <span>
                <span className="block text-[14px] font-medium text-[#1b212d]">{title}</span>
                <span className="mt-[3px] block text-[12px] leading-[18px] text-[#8792a5]">{description}</span>
            </span>
            <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="peer sr-only" />
            <span className="relative h-[24px] w-[42px] shrink-0 rounded-full bg-[#d3d9e4] transition after:absolute after:left-[3px] after:top-[3px] after:h-[18px] after:w-[18px] after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:bg-[#5798f5] peer-checked:after:translate-x-[18px] peer-focus-visible:ring-2 peer-focus-visible:ring-[#5798f5]/40" />
        </label>
    );
}

export function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);
    async function copy() {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
        } catch (error) {
            console.error("Failed to copy address:", error);
        }
    }
    return <button type="button" onClick={() => void copy()} className="h-[36px] shrink-0 rounded-[8px] border border-[#d9dee8] bg-white px-[14px] text-[13px] font-medium text-[#647085] transition hover:border-[#5798f5] hover:text-[#3f82df]">{copied ? "Kopeeritud" : "Kopeeri"}</button>;
}

export interface SettingsProps {
    preBellMinutes: number;
    windowsSettings: WindowsSettings;
    connectionInfo: ConnectionInfo | null;
    ntpServer: string;
    currentMasterPin: string;
    nextMasterPin: string;
    playNowPin: string;
    pinsConfigured: boolean | null;
    onPreBellMinutesChange: (value: number) => void;
    onNtpServerChange: (value: string) => void | Promise<void>;
    onWindowsSettingChange: (key: keyof WindowsSettings, value: boolean) => void | Promise<void>;
    onPinChange: (key: "currentMaster" | "nextMaster" | "playNow", value: string) => void;
    onSavePins: (event: React.FormEvent<HTMLFormElement>) => void;
    onDisablePins: () => void;
}

export default function Settings({
    preBellMinutes,
    windowsSettings,
    connectionInfo,
    ntpServer,
    currentMasterPin,
    nextMasterPin,
    playNowPin,
    pinsConfigured,
    onPreBellMinutesChange,
    onNtpServerChange,
    onWindowsSettingChange,
    onPinChange,
    onSavePins,
    onDisablePins,
}: SettingsProps) {
    const [pinSetupOpen, setPinSetupOpen] = useState(pinsConfigured === true);
    const [ntpDraft, setNtpDraft] = useState(ntpServer);

    useEffect(() => {
        if (pinsConfigured === true) {
            setPinSetupOpen(true);
        } else if (pinsConfigured === false) {
            setPinSetupOpen(false);
        }
    }, [pinsConfigured]);

    useEffect(() => {
        setNtpDraft(ntpServer);
    }, [ntpServer]);

    const addresses = connectionInfo?.addresses ?? (
        connectionInfo?.address
            ? [{
                address: connectionInfo.address,
                interfaceName: connectionInfo.interfaceName ?? "Võrk",
                connectionType: connectionInfo.connectionType === "none"
                    ? "other"
                    : connectionInfo.connectionType,
            }]
            : []
    );

    return (
        <main className="ml-[240px] box-border min-h-screen w-[calc(100%_-_240px)] bg-[#f5f7fb] px-[clamp(24px,4vw,64px)] pb-[56px] pt-[36px] font-['Inter']">
            <div className="mx-auto w-full max-w-[960px]">
                <header className="mb-[28px]">
                    <p className="m-0 mb-[8px] text-[12px] font-medium uppercase tracking-[0.08em] text-[#8490a3]">Rakendus</p>
                    <h1 className="m-0 text-[28px] font-semibold leading-tight text-[#1b212d]">Seaded</h1>
                    <p className="m-0 mt-[6px] text-[14px] text-[#647085]">Kohanda heli ja Windowsi käitumist.</p>
                </header>

                <div className="grid w-full items-start gap-[18px] xl:grid-cols-2">
                    <SettingsCard title="Heli" description="Vali heliväljund ja helitugevus.">
                        <AudioSettings />
                        <div className="mt-[28px] border-t border-[#eef1f5] pt-[22px]">
                            <label htmlFor="pre-bell-minutes" className="block text-[14px] font-medium text-[#1f2937]">Eelhelinaeg</label>
                            <p className="m-0 mt-[4px] text-[13px] leading-[20px] text-[#8792a5]">Mitu minutit enne kella eelhelin mängib.</p>
                            <div className="mt-[12px] flex items-center gap-[10px]">
                                <input id="pre-bell-minutes" type="number" min="0" max="60" value={preBellMinutes} onChange={(event) => onPreBellMinutesChange(Number(event.target.value))} className="h-[40px] w-[90px] rounded-[8px] border border-[#d9dee8] bg-white px-[12px] text-[14px] tabular-nums text-[#1f2937] outline-none transition focus:border-[#5798f5] focus:ring-2 focus:ring-[#5798f5]/20" />
                                <span className="text-[13px] text-[#647085]">min</span>
                            </div>
                        </div>
                    </SettingsCard>

                    <SettingsCard title="Windows" description="Määra, kuidas koolikell Windowsis käivitub.">
                        <div className="flex flex-col gap-[10px]">
                            <SettingToggle title="Käivita Windowsiga" description="Ava koolikell automaatselt pärast sisselogimist." checked={windowsSettings.openAtLogin} onChange={(value) => void onWindowsSettingChange("openAtLogin", value)} />
                            <SettingToggle title="Käivita minimeeritult" description="Käivitub taustal ilma akent avamata." checked={windowsSettings.openAsHidden} onChange={(value) => void onWindowsSettingChange("openAsHidden", value)} />
                        </div>
                    </SettingsCard>
                </div>

                <div className="mt-[18px]">
                    <SettingsCard title="Kaugühendus" description="Selle arvuti aadress, millega teised seadmed saavad ühenduda.">
                        {addresses.length > 0 ? (
                            <div className="grid gap-[10px]">
                                {addresses.map((item) => {
                                    const url = `http://${item.address}:${connectionInfo?.port ?? 3000}`;
                                    const label = item.connectionType === "ethernet"
                                        ? "Ühendus kaabli kaudu"
                                        : item.connectionType === "wifi"
                                            ? "Ühendus Wi‑Fi kaudu"
                                            : "Võrguühendus";
                                    return (
                                        <div key={`${item.interfaceName}-${item.address}`} className="flex items-center justify-between gap-[16px] rounded-[10px] bg-[#f7f8fb] px-[16px] py-[14px]">
                                            <div className="min-w-0">
                                                <a href={url} target="_blank" rel="noreferrer" onClick={(event) => { event.preventDefault(); if (window.electronAPI?.openExternal) { void window.electronAPI.openExternal(url); } else { window.open(url, "_blank", "noopener,noreferrer"); } }} className="block truncate text-[16px] font-semibold text-[#3f82df] underline underline-offset-[3px] hover:text-[#2465b8]">{url}</a>
                                                <div className="mt-[4px] text-[12px] text-[#8792a5]">{label} · {item.interfaceName}</div>
                                            </div>
                                            <CopyButton text={url} />
                                        </div>
                                    );
                                })}
                            </div>
                        ) : <div className="text-[13px] text-[#b42318]">Võrguaadressi ei leitud</div>}
                    </SettingsCard>
                </div>

                <div className="mt-[18px]">
                    <SettingsCard title="NTP-server" description="Server, mille järgi kontrollitakse arvuti kellaaega.">
                        <div className="flex flex-wrap items-center gap-[10px]">
                            <input type="text" value={ntpDraft} onChange={(event) => setNtpDraft(event.target.value)} placeholder="ntp1.eenet.ee" className="h-[40px] w-full max-w-[360px] rounded-[8px] border border-[#d9dee8] bg-white px-[12px] text-[14px] outline-none focus:border-[#5798f5] focus:ring-2 focus:ring-[#5798f5]/20" />
                            <button type="button" onClick={() => void onNtpServerChange(ntpDraft)} className="h-[40px] rounded-[8px] bg-[#5798f5] px-[16px] text-[13px] font-medium text-white">Salvesta</button>
                        </div>
                    </SettingsCard>
                </div>

                <div className="mt-[18px]">
                    <SettingsCard title="PIN-koodid" description="Määra neljakohaline meister-PIN ja eraldi PlayNow-PIN.">
                        {pinsConfigured === false && !pinSetupOpen && (
                            <button type="button" onClick={() => setPinSetupOpen(true)} className="h-[40px] rounded-[8px] bg-[#5798f5] px-[16px] text-[13px] font-medium text-white">
                                Lülita PIN-id sisse
                            </button>
                        )}
                        {pinSetupOpen && <form onSubmit={onSavePins} className="grid max-w-[520px] gap-[12px]">
                            <input type="password" inputMode="numeric" maxLength={4} placeholder={pinsConfigured === false ? "Praegune meister-PIN (pole vaja)" : "Praegune meister-PIN"} value={currentMasterPin} onChange={(event) => onPinChange("currentMaster", event.target.value.replace(/\D/g, "").slice(0, 4))} className="h-[40px] rounded-[8px] border border-[#d9dee8] px-[12px] text-[14px] outline-none" />
                            <input type="password" inputMode="numeric" maxLength={4} placeholder="Uus meister-PIN" value={nextMasterPin} onChange={(event) => onPinChange("nextMaster", event.target.value.replace(/\D/g, "").slice(0, 4))} className="h-[40px] rounded-[8px] border border-[#d9dee8] px-[12px] text-[14px] outline-none" />
                            <input type="password" inputMode="numeric" maxLength={4} placeholder="Uus PlayNow-PIN" value={playNowPin} onChange={(event) => onPinChange("playNow", event.target.value.replace(/\D/g, "").slice(0, 4))} className="h-[40px] rounded-[8px] border border-[#d9dee8] px-[12px] text-[14px] outline-none" />
                            <div className="flex flex-wrap gap-[8px]">
                                <button type="submit" className="h-[40px] w-fit rounded-[8px] bg-[#5798f5] px-[16px] text-[13px] font-medium text-white">Salvesta PIN-id</button>
                                {pinsConfigured === true && <button type="button" onClick={onDisablePins} className="h-[40px] w-fit rounded-[8px] border border-[#f0caca] px-[16px] text-[13px] font-medium text-[#b42318]">Lülita PIN-id välja</button>}
                            </div>
                        </form>}
                    </SettingsCard>
                </div>

                <div className="mt-[18px]"><SettingsCard title="Avatud lähtekoodiga projekt" description="koolikell on avatud lähtekoodiga projekt."><a href="https://github.com/n1vers/koolikell" target="_blank" rel="noreferrer" className="inline-block text-[14px] font-medium text-[#3f82df] underline underline-offset-[3px] transition hover:text-[#2465b8]">Vaata projekti GitHubis</a></SettingsCard></div>
                <AppLogs />
            </div>
        </main>
    );
}
