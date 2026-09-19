import Docker from "dockerode";

export async function pullImage(image: string, tag: string) {
    const docker = new Docker();

    return new Promise((res, rej) => {
        docker.pull(image, (err: Error, stream: NodeJS.ReadableStream) => {
            if (err) return err;

            docker.modem.followProgress(
                stream,
                function onFinished(finalErr, ouput) {
                    if (finalErr) return rej(finalErr);
                    res(ouput);
                },
                function onProgress(event) {
                    console.log(event.status);
                },
            );
        });
    });
}
