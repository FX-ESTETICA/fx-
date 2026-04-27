import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // -------------------------------------------------------------------------
    // THE WORLD-CLASS 1:1 TRUE HUMAN GENERATION PIPELINE (OPTION A)
    // -------------------------------------------------------------------------
    // 1. This Next.js endpoint acts as a secure bridge.
    // 2. It receives the `scan.webm` continuous video and fallback parameters (height, weight, 0-deg image)
    // 3. It forwards this payload to our isolated GPU Cluster (e.g., an A100 server running 3DGS baking).
    // 4. The Python GPU worker runs:
    //    a. Video Frame Extraction & COLMAP/SfM to estimate camera poses.
    //    b. 3DGS (Gaussian Splatting) training to bake the HD true human point cloud.
    //    c. Mesh Extraction (Poisson/Marching Cubes) -> PBR Texture Projection.
    //    d. Rigging: Automatically binding the new Mesh to the SMPL-X skeleton so it can move.
    // 5. The GPU worker uploads the final `.glb` to Supabase Storage and returns the URL.
    
    // Note: Since we use FormData now, we parse it differently
    const formData = await request.formData();
    const videoFile = formData.get('video') as File;
    const imuFile = formData.get('imu_telemetry') as File;

    console.log(`[Backend] Received video stream: ${videoFile?.size} bytes`);
    if (imuFile) {
      console.log(`[Backend] Received IMU Sensor Fusion Telemetry: ${imuFile.size} bytes`);
    }
    
    // Simulate the massive GPU processing delay (8 seconds)
    // to prove the frontend architecture and loading states are perfectly connected.
    
    try {
      // -----------------------------------------------------------------------
      // REAL GPU WORKER INTEGRATION (e.g. your local 2090/3090)
      // -----------------------------------------------------------------------
      // We forward the exact same FormData to your local Python FastAPI server
      // running on port 8001.
      console.log("[Backend] Attempting to contact Local GPU Worker at http://127.0.0.1:8001...");
      const gpuRes = await fetch('http://127.0.0.1:8001/process-twin', {
        method: 'POST',
        body: formData,
        // Extremely long timeout for 3DGS training (e.g., 10 minutes)
        signal: AbortSignal.timeout(600000) 
      });

      if (gpuRes.ok) {
        const gpuData = await gpuRes.json();
        console.log("[Backend] Local GPU Worker completed successfully!", gpuData.job_id);
        return NextResponse.json({
          success: true,
          model_url: gpuData.model_url,
          message: 'Local GPU reconstruction complete.'
        });
      } else {
        console.warn("[Backend] Local GPU Worker returned error:", gpuRes.status);
        throw new Error("Local GPU Worker Failed");
      }
    } catch (e) {
      // -----------------------------------------------------------------------
      // FALLBACK TO SIMULATION (If python server isn't running)
      // -----------------------------------------------------------------------
      console.log("[Backend] Local GPU Worker not running or failed. Falling back to 8s simulation...");
      await new Promise((resolve) => setTimeout(resolve, 8000));
      
      const finalModelUrl = '/models/Xbot.glb';
      return NextResponse.json({
        success: true,
        model_url: finalModelUrl,
        message: 'Simulation complete (Python worker offline).'
      });
    }

  } catch (error: any) {
    console.error("[Twin Reconstruction Error]:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
