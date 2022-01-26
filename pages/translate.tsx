import type { NextPage } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import {useEffect, useRef, useState} from "react";
import {BounceLoader} from "react-spinners";
import {IWord} from "../types/IWord";
import {unique} from "../utils/unique";

const Translate: NextPage = () => {
    const videoRef = useRef(null);
    const [record, setRecord] = useState<boolean>(false)
    const [text, setText] = useState<string>("")
    const [connecting, setConnecting] = useState<boolean>(false)
    const [connected, setConnected] = useState<boolean>(false)
    const [pc, setPc] = useState<RTCPeerConnection | undefined>(undefined)
    const [dataChanel, setDataChannel] = useState<RTCDataChannel | undefined>(undefined)

    useEffect(() => {
        const constr = {
            audio: false,
            video: {
                width: { min: window.innerWidth, max: window.innerWidth},
                height: { min: window.innerHeight, max: window.innerHeight},
                facingMode: "user"
            }
        }

        const locPc = new RTCPeerConnection({
            sdpSemantics: 'unified-plan',
            iceServers: [
                {urls: ['stun:stun.l.google.com:19302']}
            ]
        } as RTCConfiguration)
        setPc(locPc)

        const dc = locPc?.createDataChannel('chat', { ordered: true })
        setDataChannel(dc)

        const sentences: Array<string> = []

        dc?.addEventListener("message", function (evt) {
            const word: IWord = JSON.parse(JSON.parse(evt.data))

            if (sentences.length > 0) {
                if (sentences[sentences.length - 1] !== word.russian) {
                    setText(prev=> prev + " " + word.russian)
                }
            } else {
                setText(prev=> prev + " " + word.russian)
            }


            sentences.push(word.russian)
        });

        // connect audio / video
        // locPc?.addEventListener('track', function(evt) {
        //     if (evt.track.kind == 'video') {
        //         // @ts-ignore
        //         videoRef.current.srcObject = evt.streams[0];
        //     } else {
        //         // @ts-ignore
        //         videoRef.current.srcObject = evt.streams[0];
        //     }
        // });

        locPc?.addEventListener('icegatheringstatechange', function() {
            console.log(locPc.iceGatheringState)
        }, false);

        locPc?.addEventListener('iceconnectionstatechange', function() {
            console.log(locPc.iceConnectionState);
        }, false);

        locPc?.addEventListener('signalingstatechange', function() {
            console.log(locPc.signalingState);
        }, false);

        navigator.mediaDevices.getUserMedia(constr).then(function(stream) {
            stream.getTracks().forEach(function (track) {
                locPc?.addTrack(track, stream);
            });

            // @ts-ignore
            return videoRef.current.srcObject = stream;
        }, function(err) {
            alert('Could not acquire media: ' + err);
        });
    }, [true])

    const handleClick = () => {
        setRecord(!record)

        if (!record) {
            return pc?.createOffer({offerToReceiveVideo: true}).then(function(offer) {
                return pc?.setLocalDescription(offer);
            }).then(function() {
                setConnecting(true)
                // wait for ICE gathering to complete
                return new Promise<void>(function(resolve) {
                    if (pc?.iceGatheringState === 'complete') {
                        resolve();
                    } else {
                        const checkState = () => {
                            console.log(pc?.iceGatheringState)
                            if (pc?.iceGatheringState === 'complete') {
                                pc?.removeEventListener('icegatheringstatechange', checkState);
                                resolve();
                            }
                        }
                        pc?.addEventListener('icegatheringstatechange', checkState);
                    }
                });
            }).then(function() {
                const offer = pc?.localDescription as RTCSessionDescription;

                //@ts-ignore
                return fetch(process.env.NEXT_PUBLIC_API, {
                    body: JSON.stringify({
                        sdp: offer.sdp,
                        type: offer.type
                    }),
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    method: 'POST'
                });
            }).then(function(response) {
                return response.json();
            }).then(function(answer) {
                setConnecting(false)
                setConnected(true)
                return pc?.setRemoteDescription(answer);
            }).catch(function(e) {
                alert(e);
            });
        } else {
            setConnected(false)

            // close data channel
            if (dataChanel) {
                dataChanel.close();
            }

            // close transceivers
            if (pc?.getTransceivers) {
                pc?.getTransceivers().forEach(function(transceiver) {
                    if (transceiver.stop) {
                        transceiver.stop();
                    }
                });
            }

            // close local audio / video
            pc?.getSenders().forEach(function(sender) {
                // @ts-ignore
                sender.track.stop()
            });

            // close peer connection
            setTimeout(function() {
                pc?.close();
            }, 500);
        }
    }

    return (
        <div>
            <Head>
                <title>Translate Signly</title>
                <meta name="description" content="Generated by create next app" />
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <header className="absolute p-3 top-4 z-50">
                <Link href="/">
                    <a>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </a>
                </Link>
            </header>
            <main>
                <div><video ref={videoRef} autoPlay={true} playsInline={true}/></div>
                {
                    connected ?
                        <div className="absolute bottom-0 w-full h-1/2 bg-black-50 animated animatedFadeInUp fadeInUp">
                            <p className={`overflow-auto text-wrap h-2/3 p-3 text-white font-semibold`}>
                                {
                                    text.split(" ").map((i) => <span key={i} className="animated animatedFadeInUp fadeInUp mr-1">{i} </span>)
                                }
                            </p>
                        </div>
                        : null
                }
                <div className="absolute left-1/2 -translate-x-1/2 bottom-8 mx-auto">
                    <div className="w-20 h-20 bg-black opacity-75 rounded-full flex justify-center items-center"></div>
                    {
                        connecting ?
                            <BounceLoader color={"#dc2626"} loading={true} size={50}/>
                            : <button
                                onClick={handleClick}
                                className={`record ${record ? " active" : ''} absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-14 h-14 bg-red-600 rounded-full`}
                            ></button>
                    }


                </div>
            </main>
        </div>
    )
}

export default Translate
