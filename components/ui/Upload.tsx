import React from 'react'
import { useOutletContext } from 'react-router';
import { CheckCircle2, UploadIcon, ImageIcon } from 'lucide-react';
import { PROGRESS_INTERVAL_MS, PROGRESS_STEP, REDIRECT_DELAY_MS } from '../../lib/constants';

interface UploadProps {
    onComplete?: (file: string) => void;
}

const Upload = ({ onComplete }: UploadProps) => {
    const { isSignedIn } = useOutletContext<AuthContext>();

    const [file, setFile] = React.useState<File | null>(null);
    const [isDragging, setIsDragging] = React.useState(false);
    const [progress, setProgress] = React.useState(0);

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
        setFile(file);
        setProgress(0);

        const reader = new FileReader();
        reader.onload = (e) => {
            const base64 = e.target?.result as string;

            const interval = setInterval(() => {
                setProgress((prev) => {
                    const next = prev + PROGRESS_STEP;
                    if (next >= 100) {
                        clearInterval(interval);
                        setTimeout(() => {
                            if (onComplete) onComplete(base64);
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
                        className={`dropzone ${isDragging ? 'is-dragging' : ''}`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        <input
                            type="file"
                            className='drop-input'
                            accept=".jpg,.png,.jpeg"
                            disabled={!isSignedIn}
                            onChange={handleFileChange}
                        />

                        <div className="drop-content">
                            <div className="drop-icon">
                                <UploadIcon size={20} />
                            </div>
                            <p>
                                {isSignedIn ? ("Click to upload or just drag and drop") : ("Sign in or sign up with Puter to upload your floor plan")}
                            </p>
                            <p className='help'>Maximum file size 50 MB.</p>
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