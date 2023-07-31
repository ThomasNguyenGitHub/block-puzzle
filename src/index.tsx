import {
  Box,
  ChakraProvider,
  Center,
  SimpleGrid,
  Stack,
  HStack,
  Heading
} from "@chakra-ui/react";
import * as React from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { makeAutoObservable } from "mobx";
import { observer } from "mobx-react";
import { Matrix } from "ml-matrix";
import { motion, LayoutGroup, AnimatePresence } from "framer-motion";

const MotionGrid = motion(SimpleGrid);
const MotionBox = motion(Box);

class Piece {
  matrix: Matrix;
  constructor(piece: number[][]) {
    makeAutoObservable(this);
    this.matrix = new Matrix(piece);
  }
}

class Board {
  data: {
    matrix: Matrix;
    score: number;
  };
  size: number;
  constructor(size) {
    this.data = {
      matrix: Matrix.zeros(size, size),
      score: 0
    };
    this.size = size;
    makeAutoObservable(this);
  }

  toString() {
    return this.data.matrix.toString();
  }

  mergePiece(piece: Piece, at: [number, number]) {
    let nextMatrix = new Matrix(this.data.matrix);
    for (let i = 0; i < piece.matrix.rows; i++) {
      for (let j = 0; j < piece.matrix.columns; j++) {
        if (piece.matrix.get(i, j) === 1) {
          const boardI = at[0] + i;
          const boardJ = at[1] + j;

          if (boardI < 0 || boardI >= this.size) {
            throw new Error("Move not allowed");
          }
          if (boardJ < 0 || boardJ >= this.size) {
            throw new Error("Move not allowed");
          }
          if (this.data.matrix.get(boardI, boardJ) === 1) {
            throw new Error("Move not allowed");
          } else {
            nextMatrix.set(boardI, boardJ, 1);
          }
        }
      }
    }
    const nextMatrixWithDeletions = new Matrix(nextMatrix);
    // delete rows
    for (let i = 0; i < this.size; i++) {
      const row = [];
      for (let j = 0; j < this.size; j++) {
        row.push(nextMatrix.get(i, j));
      }
      if (row.every((val) => val === 1)) {
        for (let j = 0; j < this.size; j++) {
          nextMatrixWithDeletions.set(i, j, 0);
        }
      }
    }
    // delete columns
    for (let i = 0; i < this.size; i++) {
      const col = [];
      for (let j = 0; j < this.size; j++) {
        col.push(nextMatrix.get(j, i));
      }
      if (col.every((val) => val === 1)) {
        for (let j = 0; j < this.size; j++) {
          nextMatrixWithDeletions.set(j, i, 0);
        }
      }
    }
    this.data.matrix = nextMatrixWithDeletions;
    this.data.score +=
      piece.matrix.to1DArray().reduce((sum, next) => sum + next, 0) * 10;
  }

  get matrix() {
    return this.data.matrix;
  }
}

const board = new Board(10);

const pieces = [
  new Piece([[1]]),
  new Piece([[1, 1]]),
  new Piece([[1], [1]]),
  new Piece([
    [0, 1],
    [1, 1]
  ]),
  new Piece([
    [1, 1],
    [0, 1]
  ]),
  new Piece([
    [1, 1],
    [1, 0]
  ]),
  new Piece([
    [1, 0],
    [1, 1]
  ]),
  new Piece([
    [1, 1],
    [1, 1]
  ]),
  new Piece([
    [0, 1],
    [0, 1],
    [1, 1]
  ]),
  new Piece([
    [1, 1],
    [1, 0],
    [1, 0]
  ]),
  new Piece([
    [1, 1, 1],
    [1, 0, 0]
  ]),
  new Piece([
    [1, 0, 0],
    [1, 1, 1]
  ]),
  new Piece([
    [1, 1, 1],
    [1, 1, 1],
    [1, 1, 1]
  ])
];

const BoardComp = observer(() => {
  return (
    <Stack>
      <Heading>{board.data.score}</Heading>
      <SimpleGrid
        id="board"
        w="fit-content"
        columns={board.matrix.columns}
        borderTop="1px solid"
        borderLeft="1px solid"
      >
        {board.matrix.to1DArray().map((val, i) => (
          <Box
            pos="relative"
            w="36px"
            h="36px"
            key={i}
            borderRight="1px solid"
            borderBottom="1px solid"
          >
            <AnimatePresence>
              {val === 1 && (
                <MotionBox
                  exit={{ scale: 0, rotate: 360 }}
                  pos="absolute"
                  inset={0}
                  key="1"
                  bg="red.300"
                />
              )}
            </AnimatePresence>
          </Box>
        ))}
      </SimpleGrid>
    </Stack>
  );
});

const getCellAtPosition = (position) => {
  const boardEl = document.getElementById("board");
  const boardRect = boardEl.getBoundingClientRect();
  let x = position.x - boardRect.x;
  let y = position.y - boardRect.y;
  return [Math.round(y / 36), Math.round(x / 36)];
};

const getRandomPieceIndex = () => {
  return Math.floor(Math.random() * pieces.length);
};

const PieceComp = () => {
  const ref = React.useRef(null);
  const [pieceIndex, setPieceIndex] = React.useState(getRandomPieceIndex);
  const [pieceCounter, setPieceCounter] = React.useState(0);

  const piece = pieces[pieceIndex];
  return (
    <MotionGrid
      ref={ref}
      layout
      key={pieceCounter}
      drag
      dragMomentum={false}
      dragSnapToOrigin
      onDragEnd={(event, info) => {
        const position = ref.current.getBoundingClientRect();
        const [row, col] = getCellAtPosition(position);
        console.log(row, col);
        try {
          board.mergePiece(piece, [row, col]);
          setPieceIndex(getRandomPieceIndex());
          setPieceCounter((p) => p + 1);
        } catch (err) {
          console.log(err);
        }
      }}
      w="fit-content"
      columns={piece.matrix.columns}
      // borderTop="1px solid"
      // borderLeft="1px solid"
    >
      {piece.matrix.to1DArray().map((val, i) => (
        <Box
          pos="relative"
          w="36px"
          h="36px"
          key={i}
          borderRight="1px solid transparent"
          borderBottom="1px solid transparent"
        >
          {val === 1 && (
            <MotionBox pos="absolute" inset={0} key="1" bg="red.300" />
          )}
        </Box>
      ))}
    </MotionGrid>
  );
};

function App() {
  return (
    <Center h="100vh" flexDirection="column" gap={12}>
      <BoardComp />
      <HStack spacing={6} h="calc(36px * 3)">
        <LayoutGroup>
          <PieceComp />
          <PieceComp />
          <PieceComp />
        </LayoutGroup>
      </HStack>
    </Center>
  );
}

const rootElement = document.getElementById("root");
const root = createRoot(rootElement);

root.render(
  <React.StrictMode>
    <ChakraProvider>
      <App />
    </ChakraProvider>
  </React.StrictMode>
);
