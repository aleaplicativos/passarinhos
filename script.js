const canvasWidth = 1024;
const canvasHeight = 768;
const precision = 2;
const pointSize = 16;
const pointSizeHalf = pointSize * 0.5;
const sinIncrement = 0.005;

const TWO_PI = Math.PI * 2;

const mainColor = "#ffffff";
const controlColor = "#2ef8a0";
const helper2Color = "#c501e2";
const helper3Color = "#4697ff";

// percent chance a bird has to spawn at any given segment
const birdThreshold = 0.5;

// worker canvas, used behind the scenes for rendering static images
const workerCanvas = document.createElement("canvas");
const workerCtx = workerCanvas.getContext("2d");
// set width and height
workerCanvas.width = canvasWidth;
workerCanvas.height = canvasHeight;

// main canvas
const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");
// set width and height
canvas.width = canvasWidth;
canvas.height = canvasHeight;

// append canvas to DOM
document.body.appendChild(canvas);

// add event listeners
document.addEventListener("mousemove", handleMouseMove, false);

let mousePos = { x: 0, y: 0 };

const birds = [
	[
		{
			points: [
				[-2.75, 178.15],
				[-1.8, 109.81],
				[-1.39, 139.32],
				[-0.99, 182.42],
				[-0.88, 192.01],
				[-0.98, 156.06],
				[-2.18, 46.42],
				[-2.36, 99.47],
				[-2.75, 178.15]
			],
			controls: [
				[-2.64, 153.41, -2.17, 107.21],
				[-1.68, 125.74, -1.45, 131.89],
				[-1.35, 185.59, -1.14, 192.46],
				[-0.97, 184.14, -0.9, 199.74],
				[-0.98, 174.86, -0.96, 163.09],
				[-0.33, 102.4, -2.15, 35.04],
				[-2.33, 58.61, -2.26, 83.47],
				[-2.47, 123.65, -2.75, 154.17]
			],
			close: true,
			scale: 1
		},
		{
			points: [
				[-2.21, 44.8],
				[2.74, 25.69]
			],
			controls: [[-2.34, 37.39, -3.02, 26.46]],
			close: false,
			scale: 1
		},
		{
			points: [
				[-1.18, 40.05],
				[0.11, 44.61]
			],
			controls: [[-0.91, 17.92, -0.07, 38.83]],
			close: false,
			scale: 1
		}
	],
	[
		{
			points: [
				[-2.87, 37.04],
				[-1.1, 187.09],
				[-1.1, 209.01],
				[-0.99, 221.79],
				[-1.1, 233.15],
				[-1.56, 204.0],
				[2.47, 159.82],
				[2.45, 137.51],
				[2.3, 134.31],
				[-2.87, 37.04]
			],
			controls: [
				[0.15, 40.21, -0.81, 142.96],
				[-1.16, 198.52, -1.15, 209.62],
				[-1.06, 211.77, -0.99, 218.79],
				[-0.94, 226.67, -1.06, 230.32],
				[-1.23, 271.73, -1.53, 262.04],
				[-2.66, 138.63, 3.0, 70.21],
				[2.4, 171.02, 2.45, 151.72],
				[2.38, 131.31, 2.35, 147.55],
				[2.28, 118.08, 2.73, 58.47]
			],
			close: true,
			scale: 0.8
		},
		{
			points: [
				[-0.92, 18.8],
				[0.08, 50.49]
			],
			controls: [[-0.27, 15.71, 0.12, 33.8]],
			close: false,
			scale: 0.8
		}
	]
];

class Point {
	x = 0;
	y = 0;
	constructor(x, y) {
		this.x = x;
		this.y = y;
	}
}

class Control {
	points = [];
	constructor(point1, point2) {
		this.points = [point1, point2];
	}
}

class BezierCurve {
	points = [];
	control = null;

	// drag state
	dragPoint = null;
	dragControl = null;
	dragStart = null;

	// sin value
	sinValue = -Math.PI * 0.5;

	// static image of birds on the curve
	birdImage = null;

	constructor(point1, point2, control) {
		this.points = [point1, point2];
		this.control = control;

		// get the bird iamge
		this.updateBirdImage();
	}
	updateBirdImage = async () => {
		this.birdImage = await getStaticImage((_ctx) => {
			_ctx.strokeStyle = "#fff";
			_ctx.fillStyle = "none";
			_ctx.lineWidth = 2;

			const timeIncrement = 0.1;

			let t = 0;
			let bezierPoints = [];

			// step through t and collect points
			while (t < 1) {
				bezierPoints.push(this.getPoint(t));
				t += timeIncrement;
			}

			for (let i = 0; i < bezierPoints.length; i++) {
				const [x, y] = bezierPoints[i];
				if (Math.random() > birdThreshold) {
					const xFlip = Math.random() > 0.5 ? -1 : 1;
					const birdScale = Math.random() * 0.2 + 0.3;

					// pick a random bird
					const bird = birds[Math.floor(Math.random() * birds.length)];
					// iterate over the curve groups
					bird.forEach(({ points, controls, close, scale }) => {
						const totalScale = birdScale * scale;

						// begin path
						_ctx.beginPath();

						points.forEach(([angle, distance], i) => {
							const xx = x + Math.cos(angle) * distance * totalScale * xFlip;
							const yy = y + Math.sin(angle) * distance * totalScale;

							if (i === 0) {
								// move to the first point
								_ctx.moveTo(xx, yy);
							} else {
								const control = controls[i - 1];
								const [angle1, distance1, angle2, distance2] = control;

								const x1 = x + Math.cos(angle1) * distance1 * totalScale * xFlip;
								const y1 = y + Math.sin(angle1) * distance1 * totalScale;
								const x2 = x + Math.cos(angle2) * distance2 * totalScale * xFlip;
								const y2 = y + Math.sin(angle2) * distance2 * totalScale;

								// bezier curve to
								_ctx.bezierCurveTo(x1, y1, x2, y2, xx, yy);
							}
						});

						// close path
						if (close) {
							_ctx.closePath();
						}
						// stroke the path
						_ctx.stroke();
					});
				}
			}
		});
	};
	getPoint = (t) => {
		const { x: point1X, y: point1Y } = this.points[0];
		const { x: point2X, y: point2Y } = this.points[1];
		const [point1, point2] = this.control.points;
		const { x: control1X, y: control1Y } = point1;
		const { x: control2X, y: control2Y } = point2;

		const [a1X, a1Y] = pointAlongLine(point1X, point1Y, control1X, control1Y, t);
		const [a2X, a2Y] = pointAlongLine(
			control1X,
			control1Y,
			control2X,
			control2Y,
			t
		);
		const [a3X, a3Y] = pointAlongLine(control2X, control2Y, point2X, point2Y, t);

		const [b1X, b1Y] = pointAlongLine(a1X, a1Y, a2X, a2Y, t);
		const [b2X, b2Y] = pointAlongLine(a2X, a2Y, a3X, a3Y, t);

		// the final point
		return pointAlongLine(b1X, b1Y, b2X, b2Y, t);
	};
	update = () => {
		ctx.lineWidth = 2;

		// increment sin value
		this.sinValue += sinIncrement;
		// get time
		const t = 0.5 + Math.sin(this.sinValue) * 0.5;

		// draw the bird image
		if (this.birdImage) {
			ctx.drawImage(this.birdImage, 0, 0);
		}

		// draw points
		ctx.fillStyle = mainColor;
		ctx.strokeStyle = "none";

		let { x: point1X, y: point1Y } = this.points[0];
		let { x: point2X, y: point2Y } = this.points[1];

		// modify if dragging
		if (this.dragPoint !== null) {
			const deltaX = mousePos.x - this.dragStart.x;
			const deltaY = mousePos.y - this.dragStart.y;
			if (this.dragPoint === 0) {
				point1X += deltaX;
				point1Y += deltaY;
			} else {
				point2X += deltaX;
				point2Y += deltaY;
			}
		}

		// draw the point
		ctx.fillRect(
			point1X - pointSizeHalf,
			point1Y - pointSizeHalf,
			pointSize,
			pointSize
		);
		// draw the point
		ctx.fillRect(
			point2X - pointSizeHalf,
			point2Y - pointSizeHalf,
			pointSize,
			pointSize
		);

		// draw controls
		ctx.fillStyle = controlColor;
		const [point1, point2] = this.control.points;
		let { x: control1X, y: control1Y } = point1;
		let { x: control2X, y: control2Y } = point2;

		// modify if dragging
		if (this.dragControl !== null) {
			const deltaX = mousePos.x - this.dragStart.x;
			const deltaY = mousePos.y - this.dragStart.y;
			if (this.dragControl === 0) {
				control1X += deltaX;
				control1Y += deltaY;
			} else {
				control2X += deltaX;
				control2Y += deltaY;
			}
		}

		// draw the control points
		ctx.fillRect(
			control1X - pointSizeHalf,
			control1Y - pointSizeHalf,
			pointSize,
			pointSize
		);
		ctx.fillRect(
			control2X - pointSizeHalf,
			control2Y - pointSizeHalf,
			pointSize,
			pointSize
		);

		// draw the full curve
		ctx.fillStyle = "none";
		ctx.strokeStyle = mainColor;

		ctx.beginPath();
		ctx.moveTo(point1X, point1Y);
		ctx.bezierCurveTo(
			control1X,
			control1Y,
			control2X,
			control2Y,
			point2X,
			point2Y
		);
		ctx.stroke();

		// draw first set of helper lines
		ctx.fillStyle = "none";
		ctx.strokeStyle = controlColor;

		ctx.beginPath();
		ctx.moveTo(point1X, point1Y);
		ctx.lineTo(control1X, control1Y);
		ctx.lineTo(control2X, control2Y);
		ctx.lineTo(point2X, point2Y);
		ctx.stroke();

		// draw the second set of helper lines
		ctx.strokeStyle = helper2Color;

		const [a1X, a1Y] = pointAlongLine(point1X, point1Y, control1X, control1Y, t);
		const [a2X, a2Y] = pointAlongLine(
			control1X,
			control1Y,
			control2X,
			control2Y,
			t
		);
		const [a3X, a3Y] = pointAlongLine(control2X, control2Y, point2X, point2Y, t);

		ctx.beginPath();
		ctx.moveTo(a1X, a1Y);
		ctx.lineTo(a2X, a2Y);
		ctx.lineTo(a3X, a3Y);
		ctx.stroke();

		// draw the third set of helper lines
		ctx.strokeStyle = helper3Color;
		const [b1X, b1Y] = pointAlongLine(a1X, a1Y, a2X, a2Y, t);
		const [b2X, b2Y] = pointAlongLine(a2X, a2Y, a3X, a3Y, t);

		ctx.beginPath();
		ctx.moveTo(b1X, b1Y);
		ctx.lineTo(b2X, b2Y);
		ctx.stroke();

		// draw the final point
		ctx.fillStyle = mainColor;
		const [c1X, c1Y] = pointAlongLine(b1X, b1Y, b2X, b2Y, t);

		// draw a point at t
		ctx.fillRect(c1X - 3, c1Y - 3, 6, 6);
	};
	onMouseDown = () => {
		// check for point clicking
		for (let i = 0; i < this.points.length; i++) {
			const point = this.points[i];
			if (clickedPoint(mousePos, point)) {
				this.dragPoint = i;
				this.dragStart = { x: mousePos.x, y: mousePos.y };
				this.birdImage = null;
				break;
			}
		}

		// if there was a point match, stop
		if (this.dragPoint !== null) return;

		// check for control point clicking
		const [point1, point2] = this.control.points;
		if (clickedPoint(mousePos, point1)) {
			this.dragControl = 0;
			this.dragStart = { x: mousePos.x, y: mousePos.y };
			this.birdImage = null;
		} else if (clickedPoint(mousePos, point2)) {
			this.dragControl = 1;
			this.dragStart = { x: mousePos.x, y: mousePos.y };
			this.birdImage = null;
		}
	};
	onMouseUp = () => {
		if (this.dragPoint === null && this.dragControl === null) return;

		const deltaX = mousePos.x - this.dragStart.x;
		const deltaY = mousePos.y - this.dragStart.y;

		if (this.dragPoint !== null) {
			const point = this.points[this.dragPoint];

			point.x += deltaX;
			point.y += deltaY;

			this.dragPoint = null;
			this.dragStart = null;
		} else {
			const point = this.control.points[this.dragControl];

			point.x += deltaX;
			point.y += deltaY;

			this.dragControl = null;
			this.dragStart = null;
		}

		// update the bird image
		this.updateBirdImage();
	};
}

class DrawingHelper {
	bezier = new BezierCurve(
		new Point(pointSizeHalf, canvasHeight * 0.5),
		new Point(canvasWidth - pointSizeHalf, canvasHeight * 0.5),
		new Control(
			new Point(256, 128),
			new Point(canvasWidth - 256, canvasHeight - 128)
		)
	);
	constructor() {
		MainLoop.setUpdate(this.update).start();
		// add event listeners
		document.addEventListener("mousedown", this.handleMouseDown, false);
		document.addEventListener("mouseup", this.handleMouseUp, false);
	}
	handleMouseDown = () => {
		this.bezier.onMouseDown();
	};
	handleMouseUp = () => {
		this.bezier.onMouseUp();
	};
	update = () => {
		try {
			ctx.clearRect(0, 0, canvasWidth, canvasHeight);

			this.bezier.update();
		} catch (e) {
			MainLoop.stop();
			console.log(`Update failed; with error: ${e}`);
		}
	};
}

function handleMouseMove(event) {
	const rect = canvas.getBoundingClientRect();
	mousePos = {
		x: event.clientX - rect.x,
		y: event.clientY - rect.y
	};
}

function clickedPoint(point1, point2) {
	return (
		point1.x > point2.x - pointSizeHalf &&
		point1.x < point2.x + pointSizeHalf &&
		point1.y > point2.y - pointSizeHalf &&
		point1.y < point2.y + pointSizeHalf
	);
}

// https://stackoverflow.com/questions/1934210/finding-a-point-on-a-line
function pointAlongLine(x1, y1, x2, y2, r) {
	return [r * x2 + (1 - r) * x1, r * y2 + (1 - r) * y1];
}

function getStaticImage(draw) {
	return new Promise((res, rej) => {
		// clear the worker canvas
		workerCtx.clearRect(0, 0, canvasWidth, canvasHeight);
		// call the draw function
		draw(workerCtx);

		const img = new Image();
		img.src = workerCanvas.toDataURL();
		img.onload = () => res(img);
		img.onerror = rej;
	});
}

new DrawingHelper();