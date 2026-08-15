package com.hhst.youtubelite;
import org.schabi.newpipe.extractor.services.youtube.PoTokenResult;
import java.lang.reflect.*;
public class Test {
    public static void test(PoTokenResult r) {
        for (Method m : PoTokenResult.class.getDeclaredMethods()) {
            System.out.println("M: " + m.getName());
        }
        for (Field f : PoTokenResult.class.getDeclaredFields()) {
            System.out.println("F: " + f.getName());
        }
    }
}
