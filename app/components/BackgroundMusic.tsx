import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX } from "lucide-react";

export default function BackgroundMusic() {
    const [audio] = useState(typeof Audio !== "undefined" ? new Audio("/audio/battle-theme.mp3") : null);
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
        if (audio) {
            audio.loop = true;
            audio.volume = 0.4;
            
            const playAudio = async () => {
                try {
                    await audio.play();
                    setIsPlaying(true);
                } catch (err) {
                    console.error("Failed to play audio:", err);
                }
            };

            // Start playing on mount
            playAudio();
        }

        return () => {
            if (audio) {
                audio.pause();
                audio.currentTime = 0;
            }
        };
    }, [audio]);

    const togglePlay = async () => {
        if (!audio) return;

        if (isPlaying) {
            audio.pause();
        } else {
            try {
                await audio.play();
            } catch (err) {
                console.error("Failed to play audio:", err);
            }
        }
        setIsPlaying(!isPlaying);
    };

    return (
        <Button
            variant="ghost"
            size="icon"
            className="fixed top-4 right-4 z-50"
            onClick={togglePlay}
            title={isPlaying ? "Mute music" : "Play music"}
        >
            {isPlaying ? <Volume2 className="h-6 w-6" /> : <VolumeX className="h-6 w-6" />}
        </Button>
    );
} 