let cena, camera, renderizador;
let drone, plantacoes = [];
let sistemaParticulasVoo, sistemaParticulasCura;
let anelEfeito; 
let luzDrone; 
let teclado = {};
let pontos = 0;
let bateria = 100;
let nivel = 1; 
let jogoAtActive = true;
let idAnimacao;

const TAMANHO_CAMPO = 40;

const domPontos = document.getElementById('txt-pontos');
const domBateria = document.getElementById('txt-bateria');
const domNivel = document.getElementById('txt-nivel'); 
const domTelaFim = document.getElementById('tela-fim');
const domMensagemFim = document.getElementById('fim-mensagem');
const domBtnRestart = document.getElementById('btn-restart');

function init3D() {
    if (idAnimacao) cancelAnimationFrame(idAnimacao);

    // 1. Cena e Neblina Atmosférica
    cena = new THREE.Scene();
    cena.background = new THREE.Color(0x0a0f1d); 
    cena.fog = new THREE.FogExp2(0x0a0f1d, 0.025);

    // 2. Câmera
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 16, 20);

    // 3. Renderizador
    renderizador = new THREE.WebGLRenderer({ antialias: true });
    renderizador.setSize(window.innerWidth, window.innerHeight);
    renderizador.toneMapping = THREE.ACESFilmicToneMapping;
    
    const container = document.getElementById('canvas-3d');
    container.innerHTML = '';
    container.appendChild(renderizador.domElement);

    // 4. Iluminação
    const luzAmbiente = new THREE.AmbientLight(0x4f46e5, 0.4); 
    cena.add(luzAmbiente);

    const luzSol = new THREE.DirectionalLight(0xfffaa0, 1.1); 
    luzSol.position.set(20, 35, 15);
    cena.add(luzSol);

    luzDrone = new THREE.PointLight(0x38bdf8, 2.5, 12);
    luzDrone.position.y = -1;

    // 5. Cenário
    const geometriaChao = new THREE.PlaneGeometry(TAMANHO_CAMPO, TAMANHO_CAMPO);
    const materialChao = new THREE.MeshStandardMaterial({ color: 0x121e13, roughness: 0.9 }); 
    const chao = new THREE.Mesh(geometriaChao, materialChao);
    chao.rotation.x = -Math.PI / 2; 
    cena.add(chao);

    criarMontanhasFundo();
    criarCanteirosTerra();
    criarNuvensCeu();
    criarCercasFazenda();
    criarBaseDecolagem();

    // 6. Construção do Drone
    drone = new THREE.Group();
    const geoCorpo = new THREE.ConeGeometry(0.7, 0.6, 8).rotateX(Math.PI);
    const corpo = new THREE.Mesh(geoCorpo, new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.7, roughness: 0.2 }));
    drone.add(corpo);

    const geoSuporte = new THREE.TorusGeometry(0.5, 0.07, 6, 12).rotateX(Math.PI / 2).translate(0, -0.4, 0);
    drone.add(new THREE.Mesh(geoSuporte, new THREE.MeshStandardMaterial({ color: 0x1e293b })));

    const geoBraco = new THREE.BoxGeometry(3.4, 0.08, 0.08);
    const matEstrutura = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9 });
    const braco1 = new THREE.Mesh(geoBraco, matEstrutura); braco1.rotation.y = Math.PI / 4;
    const braco2 = new THREE.Mesh(geoBraco, matEstrutura); braco2.rotation.y = -Math.PI / 4;
    drone.add(braco1, braco2);

    const geoHelice = new THREE.BoxGeometry(1.0, 0.01, 0.08);
    const matHelice = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });
    drone.helices = [];
    const posMotores = [{x:1.2, z:1.2}, {x:-1.2, z:1.2}, {x:1.2, z:-1.2}, {x:-1.2, z:-1.2}];

    posMotores.forEach(pos => {
        const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.2, 8), new THREE.MeshStandardMaterial({ color: 0x64748b }));
        motor.position.set(pos.x, 0.1, pos.z);
        const helice = new THREE.Mesh(geoHelice, matHelice);
        helice.position.y = 0.12;
        motor.add(helice);
        drone.add(motor);
        drone.helices.push(helice);
    });

    drone.add(luzDrone); 
    drone.position.set(0, 4, 0); 
    cena.add(drone);

    // 7. Efeito de Onda de Impacto
    const geoAnel = new THREE.RingGeometry(0.1, 0.6, 16);
    const matAnel = new THREE.MeshBasicMaterial({ 
        color: 0x22c55e, 
        side: THREE.DoubleSide, 
        transparent: true, 
        opacity: 0, 
        blending: THREE.AdditiveBlending 
    });
    anelEfeito = new THREE.Mesh(geoAnel, matAnel);
    anelEfeito.rotation.x = -Math.PI / 2; 
    cena.add(anelEfeito);

    // 8. Partículas e Plantações
    criarSistemasParticulas();
    
    jogoAtActive = true;
    pontos = 0;
    bateria = 100;
    nivel = 1; 
    
    if(domPontos) domPontos.textContent = pontos;
    if(domBateria) domBateria.textContent = bateria + "%";
    if(domNivel) domNivel.textContent = nivel;
    if(domTelaFim) domTelaFim.classList.add('escondido');

    gerarFazendaMilhoSoja(); 
    animate();
}

function aoApertar(e) { teclado[e.key.toLowerCase()] = true; }
function aoSoltar(e) { teclado[e.key.toLowerCase()] = false; }

// --- CONSTRUÇÃO DO CENÁRIO ---
function criarMontanhasFundo() {
    for (let i = 0; i < 14; i++) {
        const tamanho = 7 + Math.random() * 12;
        const montanha = new THREE.Mesh(
            new THREE.ConeGeometry(tamanho, tamanho * 1.5, 4),
            new THREE.MeshLambertMaterial({ color: 0x0c1220, flatShading: true })
        );
        const angulo = Math.random() * Math.PI * 2;
        const raio = 40 + Math.random() * 15;
        montanha.position.set(Math.cos(angulo) * raio, (tamanho * 1.5) / 2 - 1, Math.sin(angulo) * raio);
        cena.add(montanha);
    }
}

function criarCanteirosTerra() {
    const fileirasZ = [-12, -4, 4, 12];
    const geoVala = new THREE.BoxGeometry(34, 0.04, 2.6);
    const matVala = new THREE.MeshStandardMaterial({ color: 0x1f140e, roughness: 0.95 }); 

    fileirasZ.forEach(z => {
        const vala = new THREE.Mesh(geoVala, matVala);
        vala.position.set(0, 0.01, z);
        cena.add(vala);
    });
}

function criarNuvensCeu() {
    for (let i = 0; i < 8; i++) {
        const nuvemGrupo = new THREE.Group();
        const matNuvem = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.2, flatShading: true });
        const b1 = new THREE.Mesh(new THREE.BoxGeometry(6, 2, 4), matNuvem);
        const b2 = new THREE.Mesh(new THREE.BoxGeometry(4, 1.8, 3), matNuvem); b2.position.set(2.5, -0.1, 0);
        nuvemGrupo.add(b1, b2);
        nuvemGrupo.position.set((Math.random() - 0.5) * 60, 15 + Math.random() * 5, (Math.random() - 0.5) * 60);
        cena.add(nuvemGrupo);
    }
}

function criarCercasFazenda() {
    const matCerca = new THREE.MeshStandardMaterial({ color: 0x2d3748, roughness: 0.5 });
    const limite = TAMANHO_CAMPO / 2;
    function erguerBarra(x, z, larg, prof) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(larg, 0.6, prof), matCerca);
        b.position.set(x, 0.3, z); cena.add(b);
    }
    erguerBarra(0, -limite, TAMANHO_CAMPO, 0.15);
    erguerBarra(0, limite, TAMANHO_CAMPO, 0.15);
    erguerBarra(-limite, 0, 0.15, TAMANHO_CAMPO);
    erguerBarra(limite, 0, 0.15, TAMANHO_CAMPO);
}

function criarBaseDecolagem() {
    const baseGrupo = new THREE.Group();
    baseGrupo.add(new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 0.05, 16), new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.5 })));
    const aro = new THREE.Mesh(new THREE.TorusGeometry(1.9, 0.04, 8, 24), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
    aro.rotation.x = Math.PI / 2;
    baseGrupo.add(aro);
    baseGrupo.position.set(0, 0.02, 0);
    cena.add(baseGrupo);
}

function criarSistemasParticulas() {
    const geoVoo = new THREE.BufferGeometry();
    const qtdVoo = 40;
    geoVoo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(qtdVoo * 3), 3));
    sistemaParticulasVoo = new THREE.Points(geoVoo, new THREE.PointsMaterial({ color: 0x38bdf8, size: 0.15, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending }));
    sistemaParticulasVoo.dados = Array.from({ length: qtdVoo }, () => ({ x: 0, y: 0, z: 0, vida: 0 }));
    cena.add(sistemaParticulasVoo);

    const geoCura = new THREE.BufferGeometry();
    const qtdCura = 75; 
    geoCura.setAttribute('position', new THREE.BufferAttribute(new Float32Array(qtdCura * 3), 3));
    sistemaParticulasCura = new THREE.Points(geoCura, new THREE.PointsMaterial({ color: 0x22c55e, size: 0.3, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending }));
    sistemaParticulasCura.dados = Array.from({ length: qtdCura }, () => ({ vx: 0, vy: 0, vz: 0, vida: 0 }));
    cena.add(sistemaParticulasCura);
}

function gerarFazendaMilhoSoja() {
    plantacoes.forEach(p => cena.remove(p.mesh));
    plantacoes = [];

    const fileirasZ = [-12, -4, 4, 12]; 
    const espacamentoX = [-14, -7, 0, 7, 14]; 

    let todasPosicoes = [];
    fileirasZ.forEach((z, fIdx) => {
        const tipoCultura = (fIdx % 2 === 0) ? 'milho' : 'soja'; 
        espacamentoX.forEach(x => {
            if (!(x === 0 && Math.abs(z) <= 4)) { 
                todasPosicoes.push({ x: x, z: z, tipo: tipoCultura });
            }
        });
    });

    let totalPragasDessaFase = Math.min(3 + nivel, 14);
    let indicesInfectados = [];
    
    while(indicesInfectados.length < totalPragasDessaFase) {
        let r = Math.floor(Math.random() * todasPosicoes.length);
        if(!indicesInfectados.includes(r)) indicesInfectados.push(r);
    }

    todasPosicoes.forEach((pos, index) => {
        const plantaGrupo = new THREE.Group();
        const ehInfectado = indicesInfectados.includes(index);
        let partesColoridas = [];

        const corInfectado = 0xd97706; 
        const corMilhoFolha = ehInfectado ? corInfectado : 0x4ade80; 
        const corSojaFolha = ehInfectado ? corInfectado : 0x15803d; 

        if (pos.tipo === 'milho') {
            const geoTronco = new THREE.CylinderGeometry(0.03, 0.06, 1.6, 4);
            const tronco = new THREE.Mesh(geoTronco, new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.9 }));
            tronco.position.y = 0.8;
            plantaGrupo.add(tronco);

            const geoFolha = new THREE.ConeGeometry(0.12, 0.7, 4).rotateX(0.4);
            const matFolha = new THREE.MeshStandardMaterial({ color: corMilhoFolha, flatShading: true });
            
            const f1 = new THREE.Mesh(geoFolha, matFolha); f1.position.set(0.15, 1.1, 0.1);
            const f2 = new THREE.Mesh(geoFolha, matFolha); f2.position.set(-0.15, 0.8, -0.1); f2.rotation.y = Math.PI;
            plantaGrupo.add(f1, f2);
            partesColoridas.push(f1, f2);

            const geoEspiga = new THREE.ConeGeometry(0.07, 0.25, 4);
            const matEspiga = new THREE.MeshStandardMaterial({ color: ehInfectado ? corInfectado : 0xfacc15, roughness: 0.6 });
            const espiga = new THREE.Mesh(geoEspiga, matEspiga);
            espiga.position.set(0.1, 0.7, 0.05);
            espiga.rotation.z = -0.3;
            plantaGrupo.add(espiga);
            partesColoridas.push(espiga);

        } else {
            const geoTronco = new THREE.CylinderGeometry(0.04, 0.07, 0.4, 4);
            const tronco = new THREE.Mesh(geoTronco, new THREE.MeshStandardMaterial({ color: 0x5c4033 }));
            tronco.position.y = 0.2;
            plantaGrupo.add(tronco);

            const geoCluster = new THREE.DodecahedronGeometry(0.35, 1);
            const matSoja = new THREE.MeshStandardMaterial({ color: corSojaFolha, flatShading: true, roughness: 0.7 });
            
            const c1 = new THREE.Mesh(geoCluster, matSoja); c1.position.set(0, 0.5, 0); c1.scale.set(1.2, 1, 1.2);
            const c2 = new THREE.Mesh(geoCluster, matSoja); c2.position.set(-0.2, 0.38, 0.1); c2.scale.set(0.8, 0.8, 0.8);
            const c3 = new THREE.Mesh(geoCluster, matSoja); c3.position.set(0.2, 0.4, -0.1); c3.scale.set(0.8, 0.8, 0.8);
            
            plantaGrupo.add(c1, c2, c3);
            partesColoridas.push(c1, c2, c3);
        }

        plantaGrupo.position.set(pos.x, 0, pos.z);
        cena.add(plantaGrupo);

        plantacoes.push({ 
            mesh: plantaGrupo, 
            partes: partesColoridas, 
            tipo: pos.tipo,
            infectado: ehInfectado 
        });
    });
}

function animate() {
    if (!jogoAtActive) return;

    idAnimacao = requestAnimationFrame(animate);

    const velocidade = 0.28;
    let movendo = false;
    
    if (teclado['w'] && drone.position.z > -TAMANHO_CAMPO/2) { drone.position.z -= velocidade; drone.rotation.x = -0.15; movendo = true; }
    if (teclado['s'] && drone.position.z < TAMANHO_CAMPO/2) { drone.position.z += velocidade; drone.rotation.x = 0.15; movendo = true; }
    if (teclado['a'] && drone.position.x > -TAMANHO_CAMPO/2) { drone.position.x -= velocidade; drone.rotation.z = 0.15; movendo = true; }
    if (teclado['d'] && drone.position.x < TAMANHO_CAMPO/2) { drone.position.x += velocidade; drone.rotation.z = -0.15; movendo = true; }

    if (!movendo) {
        drone.rotation.x *= 0.8;
        drone.rotation.z *= 0.8;
    }

    drone.helices.forEach(h => h.rotation.y += 0.5);

    camera.position.x = THREE.MathUtils.lerp(camera.position.x, drone.position.x, 0.08);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, drone.position.z + 13, 0.08);
    camera.lookAt(drone.position.x, drone.position.y - 1.5, drone.position.z);

    const drenoPassivoFase = 0.05 + (nivel - 1) * 0.035;
    bateria -= drenoPassivoFase;

    if (teclado[' ']) {
        const drenoSprayFase = 0.35 + (nivel - 1) * 0.08;
        bateria -= drenoSprayFase; 
        checarTratamento();
        dispararSprayCura();
    }

    if (bateria <= 0) { bateria = 0; finalizarJogo(); }
    if(domBateria) domBateria.textContent = Math.floor(bateria) + "%";

    if (luzDrone.intensity > 2.5) {
        luzDrone.intensity -= 0.15;
    }

    if (anelEfeito && anelEfeito.material.opacity > 0) {
        anelEfeito.scale.x += 0.3;
        anelEfeito.scale.y += 0.3;
        anelEfeito.material.opacity -= 0.04; 
    }

    plantacoes.forEach(p => {
        if (p.infectado) {
            const velocidadeTremor = 0.008 + (nivel * 0.002);
            p.mesh.rotation.y = Math.sin(Date.now() * velocidadeTremor) * 0.06;
        }
    });

    // Loops das partículas ativados para rodar a cada renderização
    loopParticulasVoo();
    loopParticulasCura();

    renderizador.render(cena, camera);
}

function loopParticulasVoo() {
    const posicoes = sistemaParticulasVoo.geometry.attributes.position.array;
    sistemaParticulasVoo.dados.forEach((p, idx) => {
        if (p.vida > 0) {
            p.y -= 0.02; p.vida -= 1;
            posicoes[idx * 3] = p.x; posicoes[idx * 3 + 1] = p.y; posicoes[idx * 3 + 2] = p.z;
        } else {
            p.x = drone.position.x + (Math.random() - 0.5) * 0.3;
            p.y = drone.position.y - 0.3;
            p.z = drone.position.z + (Math.random() - 0.5) * 0.3;
            p.vida = 15 + Math.random() * 15;
        }
    });
    sistemaParticulasVoo.geometry.attributes.position.needsUpdate = true;
}

function disparoEfeitosVisuais() {
    if (anelEfeito) {
        anelEfeito.position.set(drone.position.x, 0.05, drone.position.z);
        anelEfeito.scale.set(1, 1, 1);
        anelEfeito.material.opacity = 1; 
    }
    luzDrone.intensity = 6.0;
}

function dispararSprayCura() {
    disparoEfeitosVisuais();

    sistemaParticulasCura.dados.forEach(p => {
        if (p.vida <= 0) {
            p.x = drone.position.x; p.y = drone.position.y - 0.4; p.z = drone.position.z;
            p.vx = (Math.random() - 0.5) * 0.15; 
            p.vy = -0.18 - Math.random() * 0.1; 
            p.vz = (Math.random() - 0.5) * 0.15;
            p.vida = 12 + Math.random() * 8;
        }
    });
}

function loopParticulasCura() {
    const posicoes = sistemaParticulasCura.geometry.attributes.position.array;
    sistemaParticulasCura.dados.forEach((p, idx) => {
        if (p.vida > 0) {
            p.x += p.vx; p.y += p.vy; p.z += p.vz; p.vida--;
            posicoes[idx * 3] = p.x; posicoes[idx * 3 + 1] = p.y; posicoes[idx * 3 + 2] = p.z;
        } else {
            posicoes[idx * 3 + 1] = -999; 
        }
    });
    sistemaParticulasCura.geometry.attributes.position.needsUpdate = true;
}

function checarTratamento() {
    plantacoes.forEach(p => {
        if (p.infectado) {
            const dist = new THREE.Vector2(drone.position.x, drone.position.z)
                .distanceTo(new THREE.Vector2(p.mesh.position.x, p.mesh.position.z));
            
            if (dist < 2.2) {
                p.infectado = false;
                
                if (p.tipo === 'milho') {
                    p.partes[0].material.color.setHex(0x4ade80); 
                    p.partes[1].material.color.setHex(0x4ade80);
                    p.partes[2].material.color.setHex(0xfacc15); 
                } else {
                    p.partes.forEach(c => c.material.color.setHex(0x15803d)); 
                }
                
                p.mesh.scale.set(1.1, 1.1, 1.1);
                p.mesh.rotation.y = 0;
                pontos++;
                if(domPontos) domPontos.textContent = pontos;

                const restamInfectados = plantacoes.some(pl => pl.infectado);
                if (!restamInfectados) {
                    nivel++; 
                    if(domNivel) domNivel.textContent = nivel;

                    const bonusBateria = Math.max(10, 35 - (nivel * 3));
                    bateria = Math.min(bateria + bonusBateria, 100); 
                    
                    gerarFazendaMilhoSoja(); 
                }
            }
        }
    });
}

// MUDANÇA CRÍTICA: Estrutura da mensagem melhorada para injetar o Nível corretamente no Game Over
function finalizarJogo() {
    jogoAtActive = false;
    if(domTelaFim) domTelaFim.classList.remove('escondido');
    
    // Injeta o texto estruturado com quebra de linha e destaque visual direto na mensagem de fim
    if(domMensagemFim) {
        domMensagemFim.innerHTML = `<strong>PANE DE ENERGIA!</strong><br><br>Você defendeu a sustentabilidade agrícola até o <strong>Nível ${nivel}</strong> e colheu um total de <strong>${pontos} sacas</strong> de alimentos saudáveis!`;
    }
    
    // Suporte extra: Se você tiver um span separado com id="txt-nivel-fim" no HTML, ele também será atualizado
    const domNivelFim = document.getElementById('txt-nivel-fim');
    if(domNivelFim) domNivelFim.textContent = nivel;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderizador.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('DOMContentLoaded', () => {
    window.addEventListener('keydown', aoApertar);
    window.addEventListener('keyup', aoSoltar);
    window.addEventListener('resize', onWindowResize);
    if(domBtnRestart) domBtnRestart.addEventListener('click', init3D);
    init3D();
});