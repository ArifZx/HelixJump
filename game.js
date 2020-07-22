'use strict'

var Game = Game || {};

let width, height;

Game.init = function () {

    height = window.innerHeight;
    width = window.innerWidth;

    this.resetGravity();

    this.scoreBoard = document.getElementById("scoreBoard");

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(90, width / height, 0.1, 1000);

    this.raycaster = new THREE.Raycaster();

    this.raycaster.near = 0.1;
    this.raycaster.far = 2;

    this.addLights();

    this.camera.position.set(0, this.player.height, -6);
    this.camera.lookAt(new THREE.Vector3(0, -this.player.height, 0));

    this.renderer = new THREE.WebGLRenderer({antialias: true});
    // this.renderer.setPixelRatio(window.devicePixelRatio);
    // const isPotrait = window.innerHeight > window.innerWidth;   
    this.renderer.setSize(width, height);
    if(Game.USE_SHADOW) {
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    this.renderer.domElement.id = 'game';
    document.body.appendChild(this.renderer.domElement);

    this.addLoader();
    this.initTouchControl();
    this.loadResources();
    requestAnimationFrame(update);
};

const touches = new Array(5);
Game.initTouchControl = function () {
    const canvas = this.renderer?.domElement;
    if(!canvas) {
        return;
    }

    const rect = canvas.getBoundingClientRect();

    function handleTouchEvent(e, isActive) {
        let i = e?.touches?.length || 0;
        const ids = [];

        while(i--) {
            const {clientX, clientY, identifier} = e.touches[i];
            const id = identifier || 0;
            ids.push(id);

            const x = clientX - rect.left; 
            const y = clientY - rect.top;
            const isOver = (x >= 0 && x <= rect.width) &&
                            (y >= 0 && y <= rect.height);
            const state = isActive === undefined ? 'move' : isActive ? 'start' : 'end'

            if(!touches[id]) {
                touches[id] = {
                    clientX,
                    clientY,
                    isActive,
                    x,
                    y,
                    isOver,
                    state
                }
            } else {
                touches[id].clientX = clientX;
                touches[id].clientY = clientY;
                touches[id].x = x;
                touches[id].y = y;
                touches[id].isOver = isOver;
                touches[id].state = state;
            }

            if(isActive) {
                touches[id].isActive = true;
            }
        }

        if(isActive !== undefined && !isActive) {
            i = touches.length;
            while(i--) {
                if(!ids.includes(i) && touches[i]) {
                    touches[i].isActive = false;
                }
            }
        }
    }

    canvas.addEventListener('touchstart', (e) => {
        handleTouchEvent(e, true)
    }, false);

    canvas.addEventListener('touchend', (e) => {
        handleTouchEvent(e, false)
    }, false);

    canvas.addEventListener('touchmove', (e) => {
        handleTouchEvent(e)
        e.preventDefault();
    }, false);

    canvas.addEventListener('mousedown', (e) => {
        handleTouchEvent({
            touches: [e]
        }, true)
    }, false);

    canvas.addEventListener('mouseup', (e) => {
        handleTouchEvent({
            touches: []
        }, false)
    }, false);

    canvas.addEventListener('mousemove', (e) => {
        handleTouchEvent({
            touches: [e]
        })
        e.preventDefault();

    }, false);
}

Game.resetGravity = function () {
    this.cy = 0;
    this.dt = 0.1;
    this.vy = 0;
    this.mvy = 1;
    this.gravity = 0.05;
    this.collision = false;
};

Game.addLights = function () {
    // LIGHTS
    var ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    this.light = new THREE.PointLight(0xffffff, 1, 18);
    this.light.position.set(-3, 6, -3);
    if(Game.USE_SHADOW) {
        this.light.castShadow = true;
        this.light.shadow.bias = - 0.0001;
        this.light.shadow.mapSize.width = 1024;
        this.light.shadow.mapSize.height = 1024;
        this.light.shadow.camera.near = 0.1;
        this.light.shadow.camera.far = 25;
    }
    this.scene.add(this.light);
};

Game.resetGame = function () {

    ind = undefined;
    _cubeBox = undefined;
    boxVector = undefined;
    spherePos = undefined;
    xPoint = undefined;
    yPoint = undefined;
    zPoint = undefined;
    clearInd = 0;

    for (var i = this.scene.children.length - 1; i >= 0; i--) {
        this.scene.remove(this.scene.children[i]);
    }
    this.addLights();
    this.GAME_STARTED = false;

    this.resetGravity();

    this.cameraY = -0.5;
    this.gameOver = false;
    this.score = 0;

    this.colliderArr = [];
    this.platformArr = [];

    this.scoreBoard.innerHTML = "Score 0";
    this.camera.position.set(0, this.player.height, -6);
    this.camera.lookAt(new THREE.Vector3(0, -this.player.height, 0));
    this.loadResources();
};

Game.addLoader = function () {

    var progress = document.createElement('div');
    progress.setAttribute("id", "loader");
    var progressBar = document.createElement('div');
    progressBar.setAttribute("id", "bar");
    progress.appendChild(progressBar);
    document.body.appendChild(progress);

    this.loadingManager = new THREE.LoadingManager();
    this.loadingManager.onProgress = function (item, loaded, total) {
        progressBar.style.width = (loaded / total * 100) + '%';
        console.log(item, loaded, total);
    };
    this.loadingManager.onLoad = function () {
        console.log("loaded all resources");
        !Game.GAME_LOADED && document.body.removeChild(progress);
        Game.GAME_LOADED = true;
        Game.GAME_STARTED = true;
        Game.onResourcesLoaded();
    };
};

Game.loadResources = function () {

    var models = {
        ball: {
            obj: "res/Ball.obj",
            mtl: "res/Ball.mtl",
            mesh: null
        }
    };
    var pie = {
        obj: "res/Pie.obj",
        mtl: null,
        mesh: null
    };

    var bgMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(100, 1000, 5, 5),
        new THREE.MeshBasicMaterial({
            color: 0xABB2B9,
            wireframe: this.USE_WIREFRAME,
            side: THREE.DoubleSide
        })
    );

    bgMesh.rotation.x += Math.PI;
    bgMesh.receiveShadow = Game.USE_SHADOW;
    bgMesh.position.set(0, -1, 4);
    this.scene.add(bgMesh);

    this.cylinder = new THREE.Mesh(
        new THREE.CylinderGeometry(1.5, 1.5, 150, 50),
        new THREE.MeshLambertMaterial({wireframe: this.USE_WIREFRAME, color: 0xEDBB99})
    );
    this.cylinder.receiveShadow = Game.USE_SHADOW;
    this.cylinder.position.set(0, -75, 0);

    this.cylinderGroup = new THREE.Group();
    this.cylinderGroup.add(this.cylinder);
    this.scene.add(this.cylinderGroup);

    this.splashGroup = new THREE.Group();
    this.cylinderGroup.add(this.splashGroup);

    // LOADING MODELS
    for (var _key in models) {
        (function (key) {

            var mtlLoader = new THREE.MTLLoader(Game.loadingManager);
            mtlLoader.load(models[key].mtl, function (materials) {
                materials.preload();

                var objLoader = new THREE.OBJLoader(Game.loadingManager);

                objLoader.setMaterials(materials);
                objLoader.load(models[key].obj, function (mesh) {

                    mesh.scale.set(0.2, 0.2, 0.2);
                    mesh.traverse(function (node) {
                        if (node instanceof THREE.Mesh) {
                            node.castShadow = Game.USE_SHADOW;
                            node.receiveShadow = Game.USE_SHADOW;
                            node.material.color.setHex(0xFFFFFF);

                            if(node.material.map) {
                                node.material.map.anisotropy = 16;
                            }
                        }
                    });
                    Game.ball = mesh;
                });
            });

        })(_key);
    }


    var textureLoader = new THREE.TextureLoader(this.loadingManager);
    var pieTexture = textureLoader.load("res/pie.jpg");
    var objLoader = new THREE.OBJLoader(this.loadingManager);
    objLoader.load(pie.obj, function (mesh) {
        mesh.traverse(function (node) {
            if (node instanceof THREE.Mesh) {
                node.castShadow = Game.USE_SHADOW;
                node.receiveShadow = Game.USE_SHADOW;
                node.material.map = pieTexture;
                node.material.color.setHex(0x922B21);
            }
        });
        Game.redPlatform = mesh.clone();
    });

    var textureLoader2 = new THREE.TextureLoader(this.loadingManager);
    var pieTexture2 = textureLoader2.load("res/pie.jpg");
    var objLoader2 = new THREE.OBJLoader(this.loadingManager);
    objLoader2.load(pie.obj, function (mesh) {
        mesh.traverse(function (node) {
            if (node instanceof THREE.Mesh) {
                node.castShadow = Game.USE_SHADOW;
                node.receiveShadow = Game.USE_SHADOW;
                node.material.map = pieTexture2;
                node.material.color.setHex(0x5499C7);
            }
        });
        Game.yellowPlatform = mesh.clone();
    });

    var textureLoader3 = new THREE.TextureLoader(this.loadingManager);
    var decalDiffuse = textureLoader3.load("res/decal-diffuse.png");
    var decalNormal = textureLoader3.load("res/decal-normal.jpg");

    this.decalMaterial = new THREE.MeshPhongMaterial({
        specular: 0x444444,
        map: decalDiffuse,
        normalMap: decalNormal,
        normalScale: new THREE.Vector2( 1, 1 ),
        shininess: 30,
        transparent: true,
        depthTest: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: - 4,
        wireframe: false
    });
    
};

Game.onResourcesLoaded = function () {

    //ball = models.ball.mesh.clone();
    this.ball.scale.set(0.02, 0.02, 0.02);
    this.ball.position.set(0, 1, -2.25);
    this.scene.add(this.ball);

    this.sphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.19, 20, 20), this.materials.solid);
    this.sphere.position.set(this.ball.position.x, this.ball.position.y, this.ball.position.z);
    this.sphere.geometry.computeBoundingSphere();
    this.scene.add(this.sphere);
    this.sphere.visible = this.MESH_VISIBILTY;

    this.addPlatform();

    this.cy = this.ball.position.y;
    this.cylinderGroup.rotation.y -= 1;
};

Game.addPlatform = function () {

    this.colliderArr = [];
    this.platformArr = [];

    var yDiff = 2;
    var platformPieceType = [
        {type: this.GREEN_PIECE},
        {type: this.RED_PIECE}
    ];
    var rotationValue = 0.786;
    var plIndex = -1;

    var levelCount = 32;
    var collider = [];
    var platGroupArr = [];
    var colliderGroupArr = [];
    var platformPiece;

    var randomPlatform = [
        {
            count: 1,
            rotation: [1.3],
            type: [0]

        },
        {
            count: 5,
            rotation: [2.8, 4.8, 5.8, 7.8, 0.8],
            type: [1, 0, 0, 1, 0]
        },
        {
            count: 3,
            rotation: [7.2, 6.2, 3.6],
            type: [0, 0, 1]
        },
        {
            count: 2,
            rotation: [0.2, 2.2],
            type: [0, 1]
        },
        {
            count: 5,
            rotation: [0.9, 2.9, 3.9, 4.9, 6.9],
            type: [1, 0, 1, 0, 0]
        },
        {
            count: 5,
            rotation: [0, 1, 2.3, 4.1, 6],
            type: [1, 0, 1, 0, 1]
        }

    ];

    for (var a = 0; a < levelCount; a++) {
        ++plIndex;

        if (plIndex >= randomPlatform.length) {
            plIndex = 0;
        }

        var type = this.shuffle(randomPlatform[plIndex].type);

        platGroupArr = [];
        colliderGroupArr = [];

        for (var i = 0; i < randomPlatform[plIndex].count; i++) {
            if (platformPieceType[type[i]].type === this.RED_PIECE)
                platformPiece = this.redPlatform.clone();
            else
                platformPiece = this.yellowPlatform.clone();

            platformPiece.position.set(0, 0, 0);

            collider = [];
            const boxBufferGeometry =  new THREE.BoxBufferGeometry(1, 1, 0.2)
            collider.push(new THREE.Mesh(boxBufferGeometry, this.materials.solid));
            collider[0].position.set(-1.83, -0.22, 1.11);
            collider[0].rotation.x += Math.PI / 2;
            collider[0].rotation.z -= 0.78;
            collider[0].receiveShadow = Game.USE_SHADOW;
            collider[0].visible = this.MESH_VISIBILTY;
            collider[0].platformType = platformPieceType[type[i]].type;


            collider.push(new THREE.Mesh(boxBufferGeometry, this.materials.solid));
            collider[1].position.set(-2.15, -0.22, 0.51);
            collider[1].rotation.x += Math.PI / 2;
            collider[1].receiveShadow = Game.USE_SHADOW;
            collider[1].visible = this.MESH_VISIBILTY;
            collider[1].platformType = platformPieceType[type[i]].type;

            var platGroup = new THREE.Group();
            platGroup.add(platformPiece);
            platGroup.add(collider[0]);
            platGroup.add(collider[1]);
            platGroup.rotation.y -= randomPlatform[plIndex].rotation[i] * rotationValue;
            platGroup.position.y -= (a * yDiff);
            this.cylinderGroup.add(platGroup);

            platGroupArr.push(platGroup);

            colliderGroupArr.push(collider[0]);
            colliderGroupArr.push(collider[1]);

        }
        this.platformArr[a * 2] = platGroupArr;
        this.colliderArr[a * 2] = colliderGroupArr;
    }

};

Game.shuffle = function (array) {
    //return array;
    var m = array.length,
        t, i;
    while (m) {
        i = Math.floor(Math.random() * m--);
        t = array[m];
        array[m] = array[i];
        array[i] = t;
    }
    return array;
};


Game.resizeRendererToDisplaySize = function(renderer) {
    const canvas = renderer.domElement;
    const pixelRatio =  1; // window.devicePixelRatio;
    const width  = canvas.clientWidth  * pixelRatio | 0;
    const height = canvas.clientHeight * pixelRatio | 0;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
      renderer.setSize(width, height, false);
    }
    return needResize;
}

let then = 0;
function update(time) {
    const delta = Math.floor(time - then) * 1e-3;
    then = time;

    requestAnimationFrame(update);
    Game.updateKeyboard();
    Game.updateTouch(delta);
    if (Game.resizeRendererToDisplaySize(Game.renderer)) {
        const canvas = Game.renderer?.domElement;
        if(canvas && Game.camera) {
            Game.camera.aspect = canvas.clientWidth / canvas.clientHeight;
            Game.camera.updateProjectionMatrix();
        }
    }
    Game.renderer.render(Game.scene, Game.camera);

    if (Game.GAME_STARTED) {
        if (!Game.gameOver) {
            if (Game.collision) { // ball is on surface

                Game.vy = -Game.vy;

                Game.addSplash();
                
                Game.collision = null;
            }
            Game.cy -= Game.vy * Game.dt;
            Game.ball.position.y = Game.cy;

            if (Game.vy <= Game.mvy)
                Game.vy += Game.gravity;

            Game.sphere.position.set(Game.ball.position.x, Game.ball.position.y, Game.ball.position.z);
            Game.updateCamera();
            Game.collision = Game.findCollision();
        }
    }
}

var ind, _cubeBox;
var boxVector;
var spherePos;
var xPoint;
var yPoint;
var zPoint;
var clearInd = 0;

Game.findCollision = function () {

    ind = Math.abs(Math.round(this.cy));

    if (clearInd < ind) {
        this.breakPlatforms(clearInd);
        clearInd = ind;
    }


    if (this.colliderArr[ind]) {
        boxVector = new THREE.Vector3();
        for (var i = 0; i < this.colliderArr[ind].length; i++) {
            _cubeBox = this.colliderArr[ind][i];
            boxVector.setFromMatrixPosition(_cubeBox.matrixWorld);
            spherePos = this.sphere.position.clone();

            xPoint = boxVector.x;
            yPoint = boxVector.y - spherePos.y;
            zPoint = boxVector.z;

            if (xPoint < 0.6 && xPoint > -0.55 && yPoint <= 2 && yPoint >= -0.2 && zPoint < -1.8 && zPoint > -2.4) {
                //console.log("x ", xPoint, "y ", yPoint, "z ", zPoint);
                if (_cubeBox.platformType === this.RED_PIECE) {
                    this.gameOver = true;
                    this.scoreBoard.innerHTML = "GAME OVER";
                    this.changeBallColor();
                    this.restart();
                }

                return true;
            }
        }
    }
    return null;
};

var splashPosition = new THREE.Vector3();
var splashRotation = new THREE.Euler(1,0,0);
var splashSize = new THREE.Vector3(1.0, 1.0, 1.0);
var addSplash = new THREE.Vector3(0.0, -1.0, 0.0);
var splashCastDirection = new THREE.Vector3(0,-1,0);
var params = {
    minScale: 0.5,
    maxScale: 1.25
}

Game.addSplash = function () {

    if(!Game.collision) {
        return;
    }

    Game.raycaster.set(Game.ball.position, splashCastDirection);
    var intersects = Game.raycaster.intersectObject(Game.cylinderGroup, true)?.filter(v => v.object?.name === "Cheese");


    if(!intersects.length) {
        return;
    }

    var scale = params.minScale + Math.random() * ( params.maxScale - params.minScale );
    splashSize.set( scale, scale, scale );
    
    splashPosition.copy(Game.ball.position);
    
    var material = Game.decalMaterial.clone();
    material.color.setHex( Math.random() * 0xffffff );

    var decalMesh = intersects[0].object;
    var splashGeom = new THREE.DecalGeometry(decalMesh, splashPosition, splashRotation, splashSize);

    var m = new THREE.Mesh(splashGeom, material);
    Game.scene.add(m);
    decalMesh.attach(m);

    setTimeout(() => {
        if(m) {
            decalMesh.remove(m);
        }
    }, 1200 * scale);
    
}

Game.restart = function () {
    var count = 2;
    var self = this;
    self.scoreBoard.innerHTML = "Game Restarting in " + (count + 1);

    var countDownId = setInterval(function () {
        if (count < 0) {
            clearInterval(countDownId);
            self.resetGame();
        } else {
            self.scoreBoard.innerHTML = "Game Restarting in " + count;
        }
        --count;

    }, 1000);
};

Game.breakPlatforms = function (clearInd) {
    clearInd = clearInd - 1;
    if (this.platformArr[clearInd]) {
        for (var i = 0; i < this.platformArr[clearInd].length; i++) {
            this.cylinderGroup.remove(this.platformArr[clearInd][i]);
        }
        this.platformArr[clearInd] = undefined;
        ++this.score;
        this.scoreBoard.innerHTML = "Score " + this.score;
    }
};

Game.updateCamera = function () {

    if (this.cameraY > this.ball.position.y)
        this.cameraY = this.ball.position.y;

    this.camera.position.set(0, this.cameraY + this.player.height, -6);
    this.camera.lookAt(new THREE.Vector3(0, this.cameraY - this.player.height, 0));
    this.light.position.set(-3, this.cameraY + this.player.height + 4, -3);
};

Game.changeBallColor = function () {

    this.ball.traverse(function (child) {
        if (child instanceof THREE.Mesh) {
            child.material.color.setHex(0x2287E5);
        }
    });
};

var keyboard = {};
Game.updateKeyboard = function () {
    if (!this.gameOver) {
        if (keyboard[37]) { // left arrow key
            this.cylinderGroup.rotation.y -= this.player.rotateSpeed;
        }

        if (keyboard[39]) { // right arrow key
            this.cylinderGroup.rotation.y += this.player.rotateSpeed;
        }
    }
};

let startRotY = 0;
let startTouchX = 0;
Game.updateTouch = function (delta) {
    if(this.gameOver) {
        return;
    }

    const touch = touches[0];

    if(!touch || !touch.isActive) {
        return;
    }

    if(touch.state === 'start') {
        startTouchX = touch.x;
        startRotY = this.cylinderGroup.rotation.y;
    }    

    this.cylinderGroup.rotation.y = startRotY + (touch.x - startTouchX) * 0.016;
}

Game.player = {
    height: 2,
    speed: 0.1,
    turnSpeed: Math.PI * 0.02,
    rotateSpeed: Math.PI * 0.01
};
Game.MESH_VISIBILTY = false;
Game.USE_WIREFRAME = false;
Game.RED_PIECE = 10;
Game.GREEN_PIECE = 11;
Game.GAME_LOADED = false;
Game.GAME_STARTED = false;
Game.USE_SHADOW = false;

Game.materials = {
    shadow: new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.5
    }),
    solid: new THREE.MeshNormalMaterial(),
    colliding: new THREE.MeshBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.5
    }),
    dot: new THREE.MeshBasicMaterial({
        color: 0x0000ff
    })
};

Game.cameraY = -0.5;
Game.gameOver = false;
Game.score = 0;


window.addEventListener('keydown', function (event) {
    keyboard[event.keyCode] = true;
});

window.addEventListener('keyup', function (event) {
    keyboard[event.keyCode] = false;
});

window.onload = function () {
    Game.init();
};