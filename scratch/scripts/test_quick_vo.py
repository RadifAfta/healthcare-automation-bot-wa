import asyncio
import edge_tts
import os

async def main():
    os.makedirs("scratch/test_voice", exist_ok=True)
    
    # Test 1: Plain text with natural punctuation
    t1 = "Capek balas chat pelanggan... satu-satu?"
    c1 = edge_tts.Communicate(t1, voice="id-ID-GadisNeural", rate="-2%", pitch="+1Hz")
    await c1.save("scratch/test_voice/t1_plain.mp3")
    print("Test 1 plain saved")

    # Test 2: Checking rate & pitch variations
    # -4% rate gives very deliberate, crisp ad narrator delivery
    t2 = "Balasnya besok pagi... pelanggan udah booking di tempat lain."
    c2 = edge_tts.Communicate(t2, voice="id-ID-GadisNeural", rate="+8%", pitch="+2Hz")
    await c2.save("scratch/test_voice/t2_rate.mp3")
    print("Test 2 rate saved")

if __name__ == "__main__":
    asyncio.run(main())
