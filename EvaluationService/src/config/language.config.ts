import { CPP_IMAGE, PYTHON_IMAGE } from "../constants/evaluation.constant.js";

export const LANGUAGE_CONFIG = {
    python: {
        timeout: 4000,
        imageName: PYTHON_IMAGE,
    },
    cpp: {
        timeout: 1000,
        imageName: CPP_IMAGE,
    },
};
