import { useLocation, useLoaderData, useNavigate, useParams, useOutletContext } from "react-router";
import { createProject, getProjectById } from "../../lib/puter.action";
import { useEffect, useRef, useState } from "react";
import { generate3DView } from "lib/ai.action";
import { Box, Download, RefreshCcw, Share2, X } from "lucide-react";
import { Button } from "components/ui/Button";
import { ReactCompareSlider, ReactCompareSliderImage } from "react-compare-slider";


export async function loader({ params }: any) {
    // Don't fetch on server - we need client auth
    return { project: null };
}

const VisualizerId = () => {
    const { id } = useParams();
    const { userId } = useOutletContext<AuthContext>();
    const navigate = useNavigate();
    const location = useLocation();
    const data = useLoaderData() as { project: DesignItem | null };

    // Use location state as fallback for immediate display
    const state = location.state as any;
    const initialProject = data?.project ?? (state?.initialImage ? {
        id: id!,
        sourceImage: state.initialImage,
        renderedImage: state.initialRender,
        name: state.name,
        timestamp: Date.now(),
        ownerId: userId
    } as DesignItem : null);

    const [project, setProject] = useState<DesignItem | null>(initialProject);
    const [isProjectLoading, setIsProjectLoading] = useState(!initialProject);






    const hasInitialGenerated = useRef(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentImage, setCurrentImage] = useState<string | null>(null)

    const handleBack = () => navigate('/');

    const runGeneration = async (item: DesignItem) => {
        if (!id || !item.sourceImage) return;

        try {
            setIsProcessing(true);
            const result = await generate3DView({ sourceImage: item.sourceImage });

            if (result.renderedImage) {
                setCurrentImage(result.renderedImage);

                const updatedItem = {
                    ...item,
                    renderedImage: result.renderedImage,
                    renderedPath: result.renderedPath,
                    timestamp: Date.now(),
                    ownerId: item.ownerId ?? userId ?? null,
                    isPublic: item.isPublic ?? false,
                }

                const saved = await createProject({ item: updatedItem, visibility: "private" })

                if (saved) {
                    setProject(saved);
                    setCurrentImage(saved.renderedImage || result.renderedImage);
                }
            }
        }
        catch (err) {
            console.log('Generation Failed : ', err);
        }
        finally {
            setIsProcessing(false);
        }
    }


    useEffect(() => {
        let isMounted = true;

        const loadProject = async () => {
            if (!id) {
                setIsProjectLoading(false);
                return;
            }

            setIsProjectLoading(true);

            const fetchedProject = await getProjectById({ id });

            if (!isMounted) return;

            if (!fetchedProject) {
                // Keep existing state (e.g. from location.state) if fetch fails/returns null
                setIsProjectLoading(false);
                return;
            }

            setProject(fetchedProject);
            setCurrentImage(fetchedProject.renderedImage || null);
            setIsProjectLoading(false);
            hasInitialGenerated.current = false;
        };

        loadProject();

        return () => {
            isMounted = false;
        };
    }, [id]);

    useEffect(() => {
        if (
            isProjectLoading ||
            hasInitialGenerated.current ||
            !project?.sourceImage
        )
            return;

        if (project.renderedImage) {
            setCurrentImage(project.renderedImage);
            hasInitialGenerated.current = true;
            return;
        }

        hasInitialGenerated.current = true;
        void runGeneration(project);
    }, [project, isProjectLoading]);

    const handleExport = () => {
        if (!currentImage) return;

        const link = document.createElement("a");
        link.href = currentImage;
        link.download = `roomify-${id || "visualizer"}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };


    return (
        <div className="visualizer">
            <nav className="topbar">
                <div className="brand">
                    <Box className="logo" />

                    <span className="name">
                        Roomify
                    </span>
                </div>
                <Button variant="ghost" size="sm" onClick={handleBack}>
                    <X className="icon" /> Exit Editor
                </Button>
            </nav>

            <section className="content">
                <div className="panel">
                    <div className="panel-header">
                        <div className="panel-meta">
                            <p>Project</p>
                            <h2>{project?.name || `Residence ${id}`}</h2>
                            <p className="note">Created by You</p>
                        </div>
                        <div className="panel-actions">
                            <Button size="sm" onClick={handleExport} className="export" disabled={!currentImage} >
                                <Download className="w-4 h-4 mr-2 icon" /> Export
                            </Button>
                            <Button size="sm" onClick={() => { }} className="share" >
                                <Share2 className="w-4 h-4 mr-2 icon" /> Share
                            </Button>
                        </div>
                    </div>

                    <div className={`render-area ${isProcessing ? 'is-processing' : ''}`}>
                        {currentImage ? (
                            <img src={currentImage} alt="AI Render" className="render-img" />
                        ) : (
                            <div className="render-placeholder">
                                {
                                    project?.sourceImage && (
                                        <img src={project?.sourceImage} alt="Original" className="render-fallback" />
                                    )
                                }
                            </div>
                        )}
                        {isProcessing && (
                            <div className="render-overlay">
                                <div className="rendering-card">
                                    <RefreshCcw className="spinner" />
                                    <span className="title">Rendering...</span>
                                    <span className="subtitle">Generating your 3D visualization</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="panel compare">
                    <div className="panel-header">
                        <div className="panel-meta">
                            <p>Comparison</p>
                            <h3>Before and After</h3>
                        </div>
                        <div className="hint">Drag to Compare</div>
                    </div>
                    <div className="compare-stage">
                        {
                            project?.sourceImage && currentImage ? (
                                <ReactCompareSlider
                                    defaultValue={50}
                                    style={{ width: '100', height: 'auto' }}
                                    itemOne={
                                        <ReactCompareSliderImage src={project?.sourceImage} alt="before" className="compare-img" />
                                    }
                                    itemTwo={
                                        <ReactCompareSliderImage src={currentImage || project?.renderedImage || undefined} alt="after" className="compare-img" />
                                    }
                                />
                            ) : (
                                <div className="compare-fallback">
                                    {
                                        project?.sourceImage && (
                                            <img src={project?.sourceImage} alt="Before" className="compare-img" />
                                        )
                                    }
                                </div>
                            )
                        }
                    </div>
                </div>
            </section>
        </div>
    );
};

export default VisualizerId;
