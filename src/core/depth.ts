/* Shared layer depths. k<1 sits behind the play plane, k>1 in front; the camera
   scales parallax, dolly and rotation by k (see mat() in ./camera). */
export const K_SP = .14;   // deep space beyond the glass
export const K_WL = .62;   // room wall
export const K_BS = .8;    // furniture base
export const K_LP = .9;    // hanging lamp
export const K_NR = 1.32;  // near foreground
