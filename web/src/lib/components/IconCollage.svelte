<!-- src/lib/components/IconCollage.svelte -->
<script lang="ts">
    import CarbonGithub from "~icons/carbon/logo-github";
    import npmIcon from 'npm.png';
    import pythonIcon from 'python.png';
    import dartIcon from 'icons8-dart-96.png';
</script>

<div class="icon-collage">
    <img src={npmIcon} alt="NPM" class="icon" />
    <img src={pythonIcon} alt="PyPI" class="icon" />
    <img src={dartIcon} alt="Pub" class="icon" />
    <CarbonGithub class="icon" />
</div>

<style>
    .icon-collage {
        display: flex;
        justify-content: center;
        align-items: center;
        position: relative;
        width: 100px; /* Adjust as needed */
        height: 100px; /* Adjust as needed */
    }

    .icon {
        width: 40px; /* Adjust size as needed */
        height: 40px; /* Adjust size as needed */
        border-radius: 5px; /* Optional: for rounded corners */
        position: absolute;
    }

    /* Positioning the icons to create a collage effect */
    .icon:nth-child(1) { top: 0; left: 0; }
    .icon:nth-child(2) { top: 0; right: 0; }
    .icon:nth-child(3) { bottom: 0; left: 0; }
    .icon:nth-child(4) { bottom: 0; right: 0; }
</style>