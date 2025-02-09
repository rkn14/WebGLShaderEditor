import React, {
  useState,
  useRef,
  useEffect,
  ChangeEvent,
  JSX,
} from "react";

export default function WebGLShaderEditor(): JSX.Element {
  
  const [vertexShader, setVertexShader] = useState<string>(`
attribute vec4 a_position;
void main() {
    gl_Position = a_position;
}
  `);

  const [fragmentShader, setFragmentShader] = useState<string>(`
precision mediump float;
uniform float u_time;

void main() {
    float r = abs(sin(u_time));
    float g = abs(sin(u_time + 1.0));
    float b = abs(sin(u_time + 2.0));
    gl_FragColor = vec4(r, g, b, 1.0);
}
  `);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileVertexRef = useRef<HTMLInputElement | null>(null);
  const fileFragmentRef = useRef<HTMLInputElement | null>(null);


  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const startTimeRef = useRef<number>(0);
  const uTimeLocationRef = useRef<WebGLUniformLocation | null>(null);

  /**
   * Shader Creation
   */
  function createShader(
    gl: WebGLRenderingContext,
    type: number,
    source: string
  ): WebGLShader | null {
    const shader = gl.createShader(type);
    if (!shader) {
      console.error("Impossible de créer le shader");
      return null;
    }
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error("Erreur de compilation du shader:", gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  /**
   * Attach Shader
   */
  function createProgram(
    gl: WebGLRenderingContext,
    vSource: string,
    fSource: string
  ): WebGLProgram | null {
    const vShader = createShader(gl, gl.VERTEX_SHADER, vSource);
    const fShader = createShader(gl, gl.FRAGMENT_SHADER, fSource);
    if (!vShader || !fShader) return null;

    const program = gl.createProgram();
    if (!program) {
      console.error("Impossible de créer le program");
      return null;
    }
    gl.attachShader(program, vShader);
    gl.attachShader(program, fShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Erreur de linkage du programme:", gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }
    return program;
  }

  /**
   * Init shaders
   */
  function initShaders(): void {
    if (!glRef.current) return;
    const gl = glRef.current;

    const newProgram = createProgram(gl, vertexShader, fragmentShader);
    if (!newProgram) return;

    programRef.current = newProgram;
    gl.useProgram(newProgram);

    // Attribut position (a_position)
    const positionLocation = gl.getAttribLocation(newProgram, "a_position");
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

    // 2 triangles
    const verts = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1,
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Uniform (u_time)
    uTimeLocationRef.current = gl.getUniformLocation(newProgram, "u_time");
  }

  /**
   * Render loop
   */
  function renderFrame(): void {
    if (!glRef.current || !programRef.current) return;
    const gl = glRef.current;

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(programRef.current);

    if (uTimeLocationRef.current) {
      const time = (Date.now() - startTimeRef.current) * 0.001;
      gl.uniform1f(uTimeLocationRef.current, time);
    }
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    requestAnimationFrame(renderFrame);
  }


  async function copyToClipboard(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error("Erreur lors de la copie:", err);
    }
  }


  function saveShader(shaderCode: string, filename: string): void {
    const blob = new Blob([shaderCode], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);
  }

  /**
   * Charge un shader depuis un fichier local.
   */
  function loadShaderFromFile(
    event: ChangeEvent<HTMLInputElement>,
    setShader: React.Dispatch<React.SetStateAction<string>>
  ): void {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result && typeof e.target.result === "string") {
        setShader(e.target.result);
      }
    };
    reader.readAsText(file);
  }

  /**
   * WebGL Initialization
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl2") || canvas.getContext("experimental-webgl");
    if (!gl) {
      alert("WebGL non supporté sur ce navigateur.");
      return;
    }

    // WebGL Context
    glRef.current = gl as WebGLRenderingContext;
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    startTimeRef.current = Date.now();

    // Shaders compilation
    initShaders();
    renderFrame();
    
  }, []);

  /**
   * Shader recompile
   */
  useEffect(() => {
    initShaders();
  }, [vertexShader, fragmentShader]);

  /**
   * Canvas size
   */
  useEffect(() => {
    function handleResize(): void {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="flex flex-row h-screen bg-gray-900 text-white">
      {/* Shader Blocks */}
      <div className="w-1/2 flex flex-col p-4 space-y-4 overflow-hidden">
        {/* Vertex Shader */}
        <div className="flex flex-col h-1/2 border border-gray-700 p-2 rounded bg-gray-800">
          <label className="text-sm text-gray-400 mb-2">Vertex Shader</label>
          <textarea
            className="flex-1 p-2 bg-gray-900 text-white focus:outline-none rounded resize-none"
            value={vertexShader}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setVertexShader(e.target.value)
            }
          />
          <div className="flex space-x-2 mt-2">
            <button
              onClick={() => copyToClipboard(vertexShader)}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded"
            >
              Copier
            </button>
            <button
              onClick={() => saveShader(vertexShader, "vertexShader.glsl")}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded"
            >
              Save File
            </button>
            <button
              onClick={() => fileVertexRef.current?.click()}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded"
            >
              Load File
            </button>
            <input
              type="file"
              accept=".glsl,.txt,.vert,.vs"
              className="hidden"
              ref={fileVertexRef}
              onChange={(e) => loadShaderFromFile(e, setVertexShader)}
            />
          </div>
        </div>

        {/* Fragment Shader */}
        <div className="flex flex-col h-1/2 border border-gray-700 p-2 rounded bg-gray-800">
          <label className="text-sm text-gray-400 mb-2">Fragment Shader</label>
          <textarea
            className="flex-1 p-2 bg-gray-900 text-white focus:outline-none rounded resize-none"
            value={fragmentShader}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setFragmentShader(e.target.value)
            }
          />
          <div className="flex space-x-2 mt-2">
            <button
              onClick={() => copyToClipboard(fragmentShader)}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded"
            >
              Copier
            </button>
            <button
              onClick={() => saveShader(fragmentShader, "fragmentShader.glsl")}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded"
            >
              Save File
            </button>
            <button
              onClick={() => fileFragmentRef.current?.click()}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded"
            >
              Load File
            </button>
            <input
              type="file"
              accept=".glsl,.txt,.frag,.fs"
              className="hidden"
              ref={fileFragmentRef}
              onChange={(e) => loadShaderFromFile(e, setFragmentShader)}
            />
          </div>
        </div>
      </div>

      {/* Render Canvas */}
      <div className="w-1/2 relative p-4">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>
    </div>
  );
}
