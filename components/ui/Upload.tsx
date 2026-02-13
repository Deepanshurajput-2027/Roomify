import React from 'react'
import { useOutletContext } from 'react-router';
import { CheckCircle2, UploadIcon, ImageIcon, XCircle } from 'lucide-react';
import { PROGRESS_INTERVAL_MS, PROGRESS_STEP, REDIRECT_DELAY_MS, MAX_FILE_SIZE_BYTES } from '../../lib/constants';

interface UploadProps {
    onComplete?: (file: string) => Promise<any> | void | boolean;
}

const Upload = ({ onComplete }: UploadProps) => {
    const { isSignedIn } = useOutletContext<AuthContext>();

    const [file, setFile] = React.useState<File | null>(null);
    const [isDragging, setIsDragging] = React.useState(false);
    const [progress, setProgress] = React.useState(0);
    const [error, setError] = React.useState<string | null>(null);

    const intervalRef = React.useRef<NodeJS.Timeout | null>(null);
    const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    React.useEffect(() => {
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        if (isSignedIn) setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (!isSignedIn) return;

        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) {
            processFile(droppedFile);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!isSignedIn) return;
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            processFile(selectedFile);
        }
    };

    const processFile = (file: File) => {
        setError(null);

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setError("Invalid file type. Please upload a valid image.");
            return;
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE_BYTES) {
            setError(`File is too large. Maximum size is ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB.`);
            return;
        }

        // Clear existing timers
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        setFile(file);
        setProgress(0);

        const reader = new FileReader();
        reader.onload = (e) => {
            const base64 = e.target?.result as string;

            intervalRef.current = setInterval(() => {
                setProgress((prev) => {
                    const next = prev + PROGRESS_STEP;
                    if (next >= 100) {
                        if (intervalRef.current) clearInterval(intervalRef.current);

                        timeoutRef.current = setTimeout(async () => {
                            if (onComplete) {
                                try {
                                    const result = await onComplete(base64);
                                    if (result === false) {
                                        throw new Error("Upload failed");
                                    }
                                } catch (e) {
                                    setError("Failed to upload project. Please try again.");
                                    setProgress(0);
                                    setFile(null);
                                }
                            }
                        }, REDIRECT_DELAY_MS);
                        return 100;
                    }
                    return next;
                });
            }, PROGRESS_INTERVAL_MS);
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className='upload'>
            {
                !file ? (
                    <div
                        className={`dropzone ${isDragging ? 'is-dragging' : ''} ${error ? 'has-error' : ''}`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        <input
                            type="file"
                            className='drop-input'
                            accept="image/*"
                            disabled={!isSignedIn}
                            onChange={handleFileChange}
                        />

                        <div className="drop-content">
                            <div className={`drop-icon ${error ? 'text-red-500' : ''}`}>
                                {error ? <XCircle size={24} className="text-red-500" /> : <UploadIcon size={20} />}
                            </div>
                            <p className={error ? "text-red-500 font-medium" : ""}>
                                {error ? error : (isSignedIn ? "Click to upload or just drag and drop" : "Sign in or sign up with Puter to upload your floor plan")}
                            </p>
                            <p className='help'>Maximum file size {MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB.</p>
                        </div>
                    </div>
                ) : (
                    <div className="upload-status">
                        <div className="status-content">
                            <div className="status-icon">
                                {
                                    progress === 100 ? (<CheckCircle2 className="check" />) : (
                                        <ImageIcon className="image" />
                                    )
                                }
                            </div>
                            <h3>{file.name}</h3>
                            <div className="progress">
                                <div className="bar" style={{ width: `${progress}%` }} />

                                <div className="status-text">
                                    {
                                        progress < 100 ? "Analyzing Floor Plan..." : "Redirecting..."
                                    }
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div>
    )
}

export default Upload